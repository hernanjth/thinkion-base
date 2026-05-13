/**
 * HubSpot client and helpers.
 *
 * IMPORTANT: Use the top-level `query` field in doSearch() for free-text deal
 * search — NOT CONTAINS_TOKEN. The `query` field supports partial/substring
 * matches (e.g. "pru" finds "Prueba"), while CONTAINS_TOKEN only matches whole
 * tokens and CONTAINS is not available for deals in HubSpot.
 *
 * Environment variables required:
 *   HUBSPOT_ACCESS_TOKEN    — Private App access token (pat-na1-...)
 *   HUBSPOT_PIPELINE_ID     — Pipeline ID for deal filtering (usually "default")
 *   HUBSPOT_OWNER_FACTURACION_ID — HubSpot user ID for billing task owner
 */

import { Client } from "@hubspot/api-client";
import {
  FilterOperatorEnum,
} from "@hubspot/api-client/lib/codegen/crm/deals/models/Filter";
import {
  AssociationSpecAssociationCategoryEnum,
} from "@hubspot/api-client/lib/codegen/crm/objects/models/AssociationSpec";

let _client: Client | null = null;

/**
 * Returns a singleton HubSpot API client.
 * Throws if HUBSPOT_ACCESS_TOKEN is not set.
 */
export function hubspotClient(): Client {
  if (!_client) {
    const token = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!token) throw new Error("HUBSPOT_ACCESS_TOKEN no configurado");
    _client = new Client({ accessToken: token });
  }
  return _client;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HubSpotDeal {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface CreateTaskOptions {
  subject: string;
  body: string;
  ownerId: string;
  /** Association type ID for deal→task. Default: 216 (HubSpot standard) */
  associationTypeId?: number;
}

// ─── Deal search ──────────────────────────────────────────────────────────────

const CLOSED_STAGES = ["closedwon", "closedlost"];
export const DEAL_SEARCH_LIMIT = 8;

/**
 * Search deals by name (free-text, supports partial matches).
 * Excludes closed deals and optionally filters by pipeline.
 *
 * @param query - Search string (e.g. "Empresa ABC" or partial "empr")
 * @returns { deals, hasMore } — hasMore = true if results were truncated
 */
export async function searchDeals(
  query: string
): Promise<{ deals: HubSpotDeal[]; hasMore: boolean }> {
  const client = hubspotClient();
  const pipelineId = process.env.HUBSPOT_PIPELINE_ID;

  const constraintFilters = [
    { propertyName: "dealstage", operator: FilterOperatorEnum.NotIn, values: CLOSED_STAGES },
    ...(pipelineId
      ? [{ propertyName: "pipeline", operator: FilterOperatorEnum.Eq, value: pipelineId }]
      : []),
  ];

  const searchResponse = await client.crm.deals.searchApi.doSearch({
    query,                                            // free-text substring search on dealname
    filterGroups: [{ filters: constraintFilters }],
    properties: ["dealname"],
    sorts: ["dealname"],
    limit: DEAL_SEARCH_LIMIT + 1,                    // fetch one extra to detect hasMore
    after: "0",
  });

  const hasMore = searchResponse.results.length > DEAL_SEARCH_LIMIT;
  const results = hasMore
    ? searchResponse.results.slice(0, DEAL_SEARCH_LIMIT)
    : searchResponse.results;

  if (results.length === 0) return { deals: [], hasMore: false };

  // Fetch associated contacts for each deal
  const dealIds = results.map((d) => d.id);
  const assocResults = await Promise.allSettled(
    dealIds.map((id) =>
      client.crm.associations.v4.basicApi.getPage("deals", id, "contacts", undefined, 20)
    )
  );

  const contactIdsByDeal = new Map<string, string[]>();
  assocResults.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value.results.length > 0) {
      contactIdsByDeal.set(dealIds[i], result.value.results.map((r) => r.toObjectId));
    }
  });

  const uniqueContactIds = [...new Set([...contactIdsByDeal.values()].flat())];
  const contactMap = new Map<string, { name: string; email: string; phone: string; createdate: string }>();

  if (uniqueContactIds.length > 0) {
    const contactResults = await Promise.allSettled(
      uniqueContactIds.map((cid) =>
        client.crm.contacts.basicApi.getById(cid, [
          "firstname", "lastname", "email", "phone", "mobilephone", "createdate",
        ])
      )
    );
    contactResults.forEach((result, i) => {
      if (result.status === "fulfilled") {
        const p = result.value.properties;
        const name = [p.firstname, p.lastname].filter(Boolean).join(" ");
        contactMap.set(uniqueContactIds[i], {
          name,
          email: p.email ?? "",
          phone: p.mobilephone ?? p.phone ?? "",
          createdate: p.createdate ?? "",
        });
      }
    });
  }

  const deals = results.map((d) => {
    const contactIds = contactIdsByDeal.get(d.id) ?? [];
    const contact = contactIds
      .map((id) => contactMap.get(id))
      .filter(Boolean)
      .sort((a, b) => (b!.createdate > a!.createdate ? 1 : -1))[0];
    return {
      id: d.id,
      name: d.properties.dealname ?? "",
      contactName: contact?.name ?? "",
      contactEmail: contact?.email ?? "",
      contactPhone: contact?.phone ?? "",
    };
  });

  return { deals, hasMore };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * Create a TODO task in HubSpot associated with a deal.
 *
 * @param dealId - HubSpot deal ID
 * @param options - Task subject, body, owner, and optional association type
 * @returns The created task ID
 */
export async function createTask(
  dealId: string,
  options: CreateTaskOptions
): Promise<string> {
  const client = hubspotClient();
  const task = await client.crm.objects.basicApi.create("tasks", {
    properties: {
      hs_task_subject: options.subject,
      hs_task_body: options.body,
      hs_task_status: "NOT_STARTED",
      hs_task_type: "TODO",
      hubspot_owner_id: options.ownerId,
      hs_timestamp: new Date().toISOString(),
    },
    associations: [
      {
        to: { id: dealId },
        types: [
          {
            associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
            associationTypeId: options.associationTypeId ?? 216,
          },
        ],
      },
    ],
  });
  return task.id;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

/**
 * Add a plain-text note to a HubSpot deal.
 *
 * @param dealId - HubSpot deal ID
 * @param body - Note text (plain text, no HTML)
 */
export async function addDealNote(dealId: string, body: string): Promise<void> {
  const client = hubspotClient();
  await client.crm.objects.basicApi.create("notes", {
    properties: {
      hs_note_body: body,
      hs_timestamp: new Date().toISOString(),
    },
    associations: [
      {
        to: { id: dealId },
        types: [
          {
            associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
            associationTypeId: 214,
          },
        ],
      },
    ],
  });
}
