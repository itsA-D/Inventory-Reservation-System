'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, Search, ExternalLink, MoreVertical } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductWithStock } from '@/lib/schemas'
import { cn } from '@/lib/utils'

// Types for flattened data
interface FlatInventoryItem {
  id: string
  name: string
  productId: string
  warehouseName: string
  totalUnits: number
  reservedUnits: number
  availableUnits: number
  price: number | string
}

export function InventoryTable({ products }: { products: ProductWithStock[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  // Flatten the products and inventory into a single array for the table
  const data: FlatInventoryItem[] = React.useMemo(() => {
    return products.flatMap((product) =>
      product.inventory.map((inv) => ({
        id: `${product.id}-${inv.warehouseId}`,
        name: product.name,
        productId: product.id,
        warehouseName: inv.warehouseName,
        totalUnits: inv.totalUnits,
        reservedUnits: inv.reservedUnits,
        availableUnits: inv.availableUnits,
        price: product.price,
      }))
    )
  }, [products])

  const columns: ColumnDef<FlatInventoryItem>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 h-8 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Product
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-zinc-900 dark:text-zinc-50">{row.getValue('name')}</span>
          <span className="text-[10px] text-zinc-500 font-mono">{row.original.productId.slice(0, 8)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'warehouseName',
      header: 'Warehouse',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-medium bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          {row.getValue('warehouseName')}
        </Badge>
      ),
    },
    {
      accessorKey: 'totalUnits',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 h-8 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-mono">{row.getValue('totalUnits')}</div>,
    },
    {
      accessorKey: 'reservedUnits',
      header: 'Reserved',
      cell: ({ row }) => (
        <div className="font-mono text-zinc-500">{row.getValue('reservedUnits')}</div>
      ),
    },
    {
      accessorKey: 'availableUnits',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4 h-8 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Available
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const available = row.getValue('availableUnits') as number
        const total = row.original.totalUnits
        const percentage = (available / total) * 100

        return (
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-mono font-bold",
              available === 0 ? "text-rose-500" : available < 5 ? "text-amber-500" : "text-emerald-500"
            )}>
              {available}
            </span>
            <div className="hidden sm:flex h-1.5 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  percentage < 20 ? "bg-rose-500" : percentage < 50 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => {
        const price = parseFloat(row.getValue('price'))
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(price)
        return <div className="font-medium font-mono">{formatted}</div>
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        return (
          <Link 
            href={`/sku/${row.original.productId}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            placeholder="Search products..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-800 transition-all"
          />
        </div>
      </div>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  {headerGroup.headers.map((header) => {
                    return (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-zinc-50"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 last:border-0"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-zinc-500">
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between py-1">
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)} of {data.length}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-zinc-200 dark:border-zinc-800 h-8 text-xs"
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-zinc-200 dark:border-zinc-800 h-8 text-xs"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
