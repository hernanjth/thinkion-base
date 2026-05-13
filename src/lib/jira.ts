/**
 * Jira Cloud REST API v3 helpers.
 *
 * Authentication: HTTP Basic Auth (email:api_token encoded as base64).
 * Descriptions use Atlassian Document Format (ADF) — a JSON structure
 * for rich text. See https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
 *
 * Environment variables required:
 *   JIRA_BASE_URL    — e.g. https://your-org.atlassian.net
 *   JIRA_EMAIL       — account email for auth
 *   JIRA_API_TOKEN   — API token from https://id.atlassian.com/manage-profile/security/api-tokens
 *   JIRA_PROJECT_KEY — project key (e.g. "OB")
 */

import { getCachedSettings } from "./settings";

type AdfNode = { type: string; content?: AdfNode[]; text?: string; [key: string]: unknown };

/**
 * Internal fetch helper for Jira REST API v3.
 * Reads JIRA_BASE_URL from settings first (DB override), then env var.
 */
async function jiraFetch(path: string, options?: RequestInit): Promise<unknown> {
  const cfg = await getCachedSettings(["jira_base_url"]);
  const base = cfg["jira_base_url"] || process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!base || !email || !token) {
    throw new Error("Jira env vars not configured (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)");
  }

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const url = `${base}/rest/api/3${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  });

  if (res.status === 204) return null;
  const body = await res.text();
  if (!res.ok) {
    console.error("[jira] HTTP", res.status, url, "body:", body.slice(0, 500));
    throw new Error(`Jira ${res.status}: ${body}`);
  }
  return body ? JSON.parse(body) : null;
}

/**
 * Find a Jira issue by a custom field value (e.g. a HubSpot deal ID).
 *
 * @param fieldId - The Jira custom field ID (e.g. "customfield_10151")
 * @param value - The value to search for
 * @returns Issue key and assignee account ID, or null if not found
 */
export async function findIssueByFieldValue(
  fieldId: string,
  value: string | number
): Promise<{ key: string; assigneeAccountId: string | null } | null> {
  const cfg = await getCachedSettings(["jira_project_key"]);
  const projectKey = cfg["jira_project_key"] || process.env.JIRA_PROJECT_KEY || "OB";
  const numValue = Number(value);

  const PAGE_SIZE = 50;
  const MAX_ISSUES = 500;
  let startAt = 0;
  let scanned = 0;

  while (scanned < MAX_ISSUES) {
    const params = new URLSearchParams({
      jql: `project = "${projectKey}"`,
      fields: `summary,assignee,${fieldId}`,
      maxResults: String(PAGE_SIZE),
      startAt: String(startAt),
    });
    const page = (await jiraFetch(`/search/jql?${params}`)) as {
      issues?: Array<{ key: string; fields: Record<string, unknown> }>;
      isLast?: boolean;
    };

    const issues = page.issues ?? [];
    for (const issue of issues) {
      const val = issue.fields[fieldId];
      if (val === numValue || String(val) === String(value)) {
        const assignee = issue.fields.assignee as { accountId: string } | null;
        return { key: issue.key, assigneeAccountId: assignee?.accountId ?? null };
      }
    }

    scanned += issues.length;
    if (page.isLast || issues.length < PAGE_SIZE) break;
    startAt += PAGE_SIZE;
  }

  return null;
}

/**
 * Create a Jira subtask under a parent issue.
 *
 * @param parentKey - Parent issue key (e.g. "OB-42")
 * @param options - Subtask details
 * @returns The created subtask key (e.g. "OB-43")
 *
 * Note: Issue type name "Subtarea" works for Spanish-locale Jira instances.
 * For English instances use "Subtask".
 */
export async function createSubtask(
  parentKey: string,
  options: {
    assigneeAccountId: string | null;
    summary: string;
    descriptionLines: string[];
    issueTypeName?: string;
  }
): Promise<string> {
  const cfg = await getCachedSettings(["jira_project_key"]);
  const projectKey = cfg["jira_project_key"] || process.env.JIRA_PROJECT_KEY || "OB";

  const descContent: AdfNode[] = options.descriptionLines.map((line) => ({
    type: "paragraph",
    content: [{ type: "text", text: line }],
  }));

  const body: Record<string, unknown> = {
    fields: {
      project: { key: projectKey },
      parent: { key: parentKey },
      issuetype: { name: options.issueTypeName ?? "Subtarea" },
      summary: options.summary,
      description: { type: "doc", version: 1, content: descContent },
    },
  };

  if (options.assigneeAccountId) {
    (body.fields as Record<string, unknown>).assignee = {
      accountId: options.assigneeAccountId,
    };
  }

  const result = (await jiraFetch("/issue", {
    method: "POST",
    body: JSON.stringify(body),
  })) as { key: string };

  return result.key;
}

/**
 * Add a plain-text comment to a Jira issue using ADF format.
 * Each string in `lines` becomes a separate paragraph.
 *
 * @param issueKey - Jira issue key (e.g. "OB-42")
 * @param lines - Lines of text to add as comment paragraphs
 */
export async function addComment(issueKey: string, lines: string[]): Promise<void> {
  const content: AdfNode[] = lines.map((line) => ({
    type: "paragraph",
    content: [{ type: "text", text: line }],
  }));

  await jiraFetch(`/issue/${issueKey}/comment`, {
    method: "POST",
    body: JSON.stringify({
      body: { type: "doc", version: 1, content },
    }),
  });
}
