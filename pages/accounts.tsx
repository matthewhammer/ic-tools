import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";
import BalanceLabel from "../components/Labels/BalanceLabel";
import Ledger from "../components/LedgerPage";
import { MetaTags } from "../components/MetaTags";
import { Table } from "../components/Tables/Table";
import fetchJSON from "../lib/fetch";
import { formatNumber } from "../lib/numbers";
import { AccountsResponse } from "../lib/types/API";

const Accounts = () => {
  const [{ rows, count }, setResponse] = useState<AccountsResponse>({
    count: 0,
    rows: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async ({ pageSize, pageIndex, sortBy }) => {
    setIsLoading(true);
    const res = await fetchJSON(
      "/api/accounts?" +
        new URLSearchParams({
          ...(sortBy.length > 0
            ? { orderBy: sortBy[0].id, order: sortBy[0].desc ? "desc" : "asc" }
            : {}),
          pageSize,
          page: pageIndex,
        })
    );
    if (res) setResponse(res);
    setIsLoading(false);
  }, []);

  const columns = useMemo(
    () => [
      {
        Header: "Account",
        id: "id",
        accessor: "id",
        disableSortBy: true,
        Cell: ({ value, row }) => {
          return (
            <Link href={`/account/${value}`}>
              <a className="hover:underline text-blue-600 overflow-hidden overflow-ellipsis">
                {row.original.name || value}
              </a>
            </Link>
          );
        },
        className: "px-2 flex-2 flex overflow-hidden",
      },
      {
        Header: "Principal",
        accessor: "principal",
        Cell: ({ value }) => (
          <Link href={`/principal/${value}`}>
            <a className="hover:underline text-blue-600 overflow-hidden overflow-ellipsis">
              {value}
            </a>
          </Link>
        ),
        className:
          "px-2 sm:flex flex-1 hidden whitespace-nowrap overflow-hidden",
      },
      {
        Header: "Balance",
        accessor: "balance",
        sortDescFirst: true,
        Cell: ({ value }) => <BalanceLabel value={value} />,
        className: "px-2 w-40 whitespace-nowrap text-right",
      },
      {
        Header: "Tx Count",
        accessor: "tx_count",
        sortDescFirst: true,
        Cell: ({ value }) => formatNumber(value),
        className: "px-2 w-20 xs:w-28 text-right",
      },
    ],
    []
  );

  const initialSort = useMemo(() => [{ id: "balance", desc: true }], []);

  return (
    <Ledger title="Accounts">
      <MetaTags
        title="Accounts"
        description="A list of accounts on the Internet Computer ledger."
      />
      <Table
        data={rows}
        columns={columns}
        count={count}
        fetchData={fetchData}
        loading={isLoading}
        initialSortBy={initialSort}
      />
    </Ledger>
  );
};

export default Accounts;
