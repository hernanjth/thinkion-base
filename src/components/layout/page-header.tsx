import React from "react";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  stat?: { label: string; value: number | string };
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, stat, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {stat !== undefined && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 tabular-nums shrink-0">
              {stat.label}: <span className="font-semibold text-gray-700">{stat.value}</span>
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0">{actions}</div>
      )}
    </div>
  );
}
