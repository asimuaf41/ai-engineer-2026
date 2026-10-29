"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";
import type { Column } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import type { Severity } from "@/components/issue-card";
import { CATEGORY_LABEL, SEVERITY_RANK } from "@/lib/dashboard/types";
import type { DashboardIssue } from "@/lib/dashboard/types";

// Everything below lives at module scope on purpose: useTable needs stable features and columns.
// If they were created inside the component, every render would rebuild the table's row models.
export const features = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { basic: sortFn_basic, text: sortFn_text },
  columnMeta: {} as { className?: string },
});

const column = createColumnHelper<typeof features, DashboardIssue>();

// WCAG 2.2 asks for a touch target of at least 24 px; the checkbox default is 16 px.
const CHECKBOX_SIZE = "size-6";

// A fixed time zone gives the same text on the server and in the browser (no hydration mismatch).
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function SortButton<TValue>({
  column: sortColumn,
  label,
}: {
  column: Column<typeof features, DashboardIssue, TValue>;
  label: string;
}) {
  const sorted = sortColumn.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ArrowUpDownIcon;

  return (
    <Button variant="ghost" size="sm" className="-ml-2" onClick={sortColumn.getToggleSortingHandler()}>
      {label}
      <Icon aria-hidden />
    </Button>
  );
}

export const columns = column.columns([
  column.display({
    id: "select",
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
        aria-label="Select all issues on this page"
        className={CHECKBOX_SIZE}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        aria-label={`Select "${row.original.title}"`}
        className={CHECKBOX_SIZE}
      />
    ),
  }),
  column.accessor((issue) => SEVERITY_RANK[issue.severity], {
    id: "severity",
    header: ({ column: severityColumn }) => <SortButton column={severityColumn} label="Severity" />,
    cell: ({ row }) => (
      <Badge variant={row.original.severity} className="capitalize">
        {row.original.severity}
      </Badge>
    ),
    sortFn: "basic",
    // The filter value is the list of picked severities; an empty list means "show all".
    filterFn: (row, _columnId, picked: Severity[]) => picked.length === 0 || picked.includes(row.original.severity),
  }),
  column.accessor((issue) => `${issue.title} ${issue.file}`, {
    id: "issue",
    header: "Issue",
    cell: ({ row }) => (
      <>
        <div className="font-medium">{row.original.title}</div>
        <div className="font-mono text-xs text-muted-foreground">{row.original.file}</div>
      </>
    ),
    sortFn: "text",
    meta: { className: "min-w-44 max-w-[28rem] whitespace-normal sm:min-w-56" },
  }),
  column.accessor((issue) => issue.repo.split("/")[1] ?? issue.repo, {
    id: "repo",
    header: "Repo",
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
    meta: { className: "hidden md:table-cell" },
  }),
  column.accessor("category", {
    header: "Area",
    cell: ({ getValue }) => CATEGORY_LABEL[getValue()],
    meta: { className: "hidden lg:table-cell" },
  }),
  column.accessor("status", {
    header: "Status",
    cell: ({ getValue }) =>
      getValue() === "fixed" ? <Badge variant="success">Fixed</Badge> : <Badge variant="outline">Open</Badge>,
    filterFn: (row, _columnId, wanted: string) => wanted === "all" || row.original.status === wanted,
  }),
  column.accessor((issue) => new Date(issue.foundAt).getTime(), {
    id: "found",
    header: ({ column: foundColumn }) => <SortButton column={foundColumn} label="Found" />,
    cell: ({ getValue }) => dateFormat.format(getValue()),
    sortFn: "basic",
    meta: { className: "hidden sm:table-cell" },
  }),
]);
