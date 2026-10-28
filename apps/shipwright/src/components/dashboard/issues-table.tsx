"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Input } from "@repo/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { duration, ease, spring } from "@repo/ui/lib/motion";
import { cn } from "@repo/ui/lib/utils";
import { SegmentedControl } from "@repo/ui/motion/segmented-control";
import { functionalUpdate, useTable } from "@tanstack/react-table";
import type { ColumnFiltersState, PaginationState, RowSelectionState, SortingState } from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon, CircleCheckIcon, ListFilterIcon, SearchXIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { debounce, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import type { Severity } from "@/components/issue-card";
import { issuesSearchParams, STATUS_FILTERS } from "@/lib/dashboard/search-params";
import { SEVERITIES } from "@/lib/dashboard/types";
import type { DashboardIssue } from "@/lib/dashboard/types";
import { columns, features } from "./issues-columns";

type StatusFilter = (typeof STATUS_FILTERS)[number];

const PAGE_SIZE = 10;
const DEFAULT_SORT: SortingState = [{ id: "severity", desc: true }];
const SORTABLE = ["severity", "issue", "found"];

// The URL holds "id.dir", e.g. "severity.desc". A hand-edited or old URL falls back to the default.
function parseSort(value: string): SortingState {
  const [id, dir] = value.split(".");
  return id && SORTABLE.includes(id) ? [{ id, desc: dir !== "asc" }] : DEFAULT_SORT;
}

function NoMatches({ query, onReset }: { query: string; onReset: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>No issues match</EmptyTitle>
        <EmptyDescription>
          {query ? `Nothing matches “${query}” with these filters.` : "Nothing matches these filters."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={onReset}>
          Reset filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function NoIssuesEver() {
  return (
    <Empty className="rounded-xl border">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-success/10 text-success">
          <CircleCheckIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>No issues found</EmptyTitle>
        <EmptyDescription>
          Shipwright checked your code, database rules, payments and AI usage, and found nothing to fix.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {/* Placeholder: scans start working on Day 13. */}
        <Button>Run a new scan</Button>
      </EmptyContent>
    </Empty>
  );
}

function SeverityFilter({
  selected,
  openCounts,
  onChange,
}: {
  selected: Severity[];
  openCounts: Record<Severity, number>;
  onChange: (next: Severity[]) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn(selected.length > 0 && "border-brand/50")}>
          <ListFilterIcon aria-hidden />
          Severity
          {selected.length > 0 && <Badge variant="secondary">{selected.length}</Badge>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {SEVERITIES.map((severity) => (
          <DropdownMenuCheckboxItem
            key={severity}
            checked={selected.includes(severity)}
            onCheckedChange={(checked) =>
              onChange(checked ? [...selected, severity] : selected.filter((item) => item !== severity))
            }
            // Keep the menu open so several severities can be picked in one go.
            onSelect={(event) => event.preventDefault()}
          >
            <span className="capitalize">{severity}</span>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{openCounts[severity]}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IssuesTableBody({ initialIssues }: { initialIssues: DashboardIssue[] }) {
  const [issues, setIssues] = useState(initialIssues);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [query, setQuery] = useQueryStates(issuesSearchParams, { history: "replace" });

  // The URL is the single source of truth: table state is worked out from it on every render.
  const sorting = useMemo(() => parseSort(query.sort), [query.sort]);
  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      { id: "severity", value: query.severity },
      { id: "status", value: query.status },
    ],
    [query.severity, query.status],
  );
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: Math.max(query.page - 1, 0), pageSize: PAGE_SIZE }),
    [query.page],
  );

  const table = useTable({
    features,
    columns,
    data: issues,
    // With real ids, a selected row stays selected when sorting, filtering or paging moves it.
    getRowId: (issue) => issue.id,
    state: { sorting, columnFilters, globalFilter: query.q, pagination, rowSelection },
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, sorting)[0];
      void setQuery({ sort: next ? `${next.id}.${next.desc ? "desc" : "asc"}` : null, page: null });
    },
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, pagination);
      void setQuery({ page: next.pageIndex === 0 ? null : next.pageIndex + 1 });
    },
    onRowSelectionChange: setRowSelection,
    globalFilterFn: "includesString",
    getColumnCanGlobalFilter: (column) => column.id === "issue" || column.id === "repo",
    enableSortingRemoval: false,
    // We reset the page ourselves (when a filter changes), so the table must not do it behind our back.
    autoResetPageIndex: false,
  });

  const pageCount = table.getPageCount();
  const lastPage = Math.max(pageCount, 1);
  useEffect(() => {
    // After "Mark as fixed" or a filter change the URL can point past the last page: move back to it.
    if (query.page > lastPage) void setQuery({ page: lastPage > 1 ? lastPage : null });
  }, [query.page, lastPage, setQuery]);

  const open = issues.filter((issue) => issue.status === "open");
  const openCounts = Object.fromEntries(
    SEVERITIES.map((severity) => [severity, open.filter((issue) => issue.severity === severity).length]),
  ) as Record<Severity, number>;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const isFiltered = query.q !== "" || query.severity.length > 0 || query.status !== "open";
  const selectedIds = Object.keys(rowSelection);
  const rows = table.getRowModel().rows;

  function resetFilters() {
    void setQuery(null);
  }

  function markAsFixed() {
    const ids = new Set(selectedIds);
    setIssues((current) => current.map((issue) => (ids.has(issue.id) ? { ...issue, status: "fixed" } : issue)));
    setRowSelection({});
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          aria-label="Search issues"
          placeholder="Search issues…"
          className="w-full sm:w-64"
          value={query.q}
          // The input updates instantly; the URL follows 300 ms after the last keystroke.
          onChange={(event) =>
            void setQuery(
              { q: event.target.value || null, page: null },
              { limitUrlUpdates: event.target.value ? debounce(300) : undefined },
            )
          }
        />
        <SeverityFilter
          selected={query.severity}
          openCounts={openCounts}
          onChange={(next) => void setQuery({ severity: next.length > 0 ? next : null, page: null })}
        />
        <SegmentedControl<StatusFilter>
          aria-label="Filter by status"
          value={query.status}
          onValueChange={(status) => void setQuery({ status, page: null })}
          options={[
            { value: "open", label: "Open", count: open.length },
            { value: "fixed", label: "Fixed", count: issues.length - open.length },
            { value: "all", label: "All" },
          ]}
        />
        {isFiltered && (
          <Button variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        )}
        <p aria-live="polite" className="ml-auto text-sm text-muted-foreground">
          {filteredCount} of {issues.length} issues
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={header.column.columnDef.meta?.className}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <NoMatches query={query.q} onReset={resetFilters} />
                </TableCell>
              </TableRow>
            ) : (
              // No row animations: rows move on every sort and filter, and animating them makes the
              // table feel slow and hard to follow.
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.pageIndex + 1} of {pageCount}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeftIcon aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRightIcon aria-hidden />
            </Button>
          </div>
        </nav>
      )}

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            key="bulk-bar"
            role="toolbar"
            aria-label="Bulk actions"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0, transition: spring.snappy }}
            exit={{ opacity: 0, y: 24, transition: { duration: duration.fast, ease: ease.in } }}
            className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center gap-2 rounded-xl border bg-popover p-2 pl-4 text-popover-foreground shadow-lg"
          >
            <p className="mr-auto text-sm font-medium">{selectedIds.length} selected</p>
            <Button onClick={markAsFixed}>Mark as fixed</Button>
            <Button variant="ghost" onClick={() => setRowSelection({})}>
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function IssuesTable({ initialIssues }: { initialIssues: DashboardIssue[] }) {
  if (initialIssues.length === 0) return <NoIssuesEver />;
  return <IssuesTableBody initialIssues={initialIssues} />;
}
