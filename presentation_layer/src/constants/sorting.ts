import React, { useState } from "react";
import * as Lucide from "lucide-react";

export type SortDirection = "asc" | "desc";

export function useTableSort<T extends string = string>(
  initialKey: T | "" = "",
  initialDirection: SortDirection = "asc"
) {
  const [sortKey, setSortKey] = useState<T | "">(initialKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = (key: T) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (key: T) => {
    if (sortKey !== key) {
      return React.createElement(Lucide.ArrowUpDown, {
        size: 13,
        className: "inline ml-1 opacity-30",
      });
    }
    return sortDirection === "asc"
      ? React.createElement(Lucide.ArrowUp, {
          size: 14,
          className: "inline ml-1 text-md-primary",
        })
      : React.createElement(Lucide.ArrowDown, {
          size: 14,
          className: "inline ml-1 text-md-primary",
        });
  };

  const sortItems = <Item extends Record<string, any>>(
    items: Item[],
    customResolvers?: Partial<Record<T, (item: Item) => any>>
  ): Item[] => {
    if (!sortKey) return items;

    return [...items].sort((a, b) => {
      let aVal = customResolvers?.[sortKey as T]
        ? customResolvers[sortKey as T]!(a)
        : a[sortKey];
      let bVal = customResolvers?.[sortKey as T]
        ? customResolvers[sortKey as T]!(b)
        : b[sortKey];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      if (
        typeof aVal === "string" &&
        typeof bVal === "string" &&
        aVal !== "—" &&
        bVal !== "—" &&
        !isNaN(Date.parse(aVal)) &&
        !isNaN(Date.parse(bVal)) &&
        (sortKey.toLowerCase().includes("date") || sortKey.toLowerCase().includes("at"))
      ) {
        const aDate = new Date(aVal).getTime();
        const bDate = new Date(bVal).getTime();
        if (!isNaN(aDate) && !isNaN(bDate) && aDate !== bDate) {
          return sortDirection === "asc" ? aDate - bDate : bDate - aDate;
        }
      }

      aVal = (aVal || "").toString().toLowerCase();
      bVal = (bVal || "").toString().toLowerCase();
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal, undefined, { numeric: true })
        : bVal.localeCompare(aVal, undefined, { numeric: true });
    });
  };

  return {
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    handleSort,
    renderSortIcon,
    sortItems,
  };
}

export const useSort = useTableSort;
