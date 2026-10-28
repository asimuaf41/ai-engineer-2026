import { Skeleton } from "@repo/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";

// Same columns (and the same responsive hiding) as issues-columns.tsx, so nothing jumps when the table loads.
const COLUMNS = [
  { className: "w-10", cell: "size-4" },
  { className: "", cell: "h-5 w-16" },
  { className: "min-w-44 sm:min-w-56", cell: "h-9 w-full max-w-72" },
  { className: "hidden md:table-cell", cell: "h-4 w-24" },
  { className: "hidden lg:table-cell", cell: "h-4 w-20" },
  { className: "", cell: "h-5 w-14" },
  { className: "hidden sm:table-cell", cell: "h-4 w-14" },
];

export function IssuesTableSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full sm:w-64" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-10 w-56" />
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  <Skeleton className="h-4 w-12" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }, (_, row) => (
              <TableRow key={row} className="h-[61px]">
                {COLUMNS.map((column, index) => (
                  <TableCell key={index} className={column.className}>
                    <Skeleton className={column.cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
