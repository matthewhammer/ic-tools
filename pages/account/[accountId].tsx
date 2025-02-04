import { Actor, HttpAgent } from "@dfinity/agent";
import { getCrc32 } from "@dfinity/principal/lib/cjs/utils/getCrc";
import classnames from "classnames";
import { DateTime } from "luxon";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { BiPencil } from "react-icons/bi";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";
import { MetaTitle } from "../../components/MetaTags";
import Search404 from "../../components/Search404";
import { TransactionTypeLabel } from "../../components/TransactionTypeLabel";
import ledgerIdl from "../../lib/canisters/ledger.did";
import { GITHUB_REPO } from "../../lib/constants";
import { formatNumber } from "../../lib/numbers";
import { TransactionResult } from "../../lib/types/TransactionResult";

const agent = new HttpAgent({ host: "https://ic0.app" });
const ledger = Actor.createActor(ledgerIdl, {
  agent,
  canisterId: "ryjl3-tyaaa-aaaaa-aaaba-cai",
});

const PAGE_SIZE = 25;

const Account = () => {
  const router = useRouter();
  const [balance, setBalance] = useState(null);
  const [txs, setTxs] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [isValid, setIsValid] = useState(true);
  const [isLoadingTxs, setIsLoadingTxs] = useState(false);
  const [page, setPage] = useState(0);
  const { accountId } = router.query as { accountId: string };

  useEffect(() => {
    if (typeof accountId !== "string" || !accountId) return;

    setBalance(null);
    setTxs(null);
    setIsLoadingTxs(false);
    setPage(0);

    let valid = false;
    try {
      const blob = Buffer.from(accountId, "hex");
      const crc32Buf = Buffer.alloc(4);
      crc32Buf.writeUInt32BE(getCrc32(blob.slice(4)));
      valid = blob.slice(0, 4).toString() === crc32Buf.toString();
    } catch (error) {
      console.warn(error);
    }
    setIsValid(valid);

    if (valid) {
      (async () => {
        const res = (await ledger.account_balance_dfx({
          account: accountId,
        })) as { es8: BigInt };
        setBalance(res["e8s"]);
      })();

      setIsLoadingTxs(true);
      fetch("https://rosetta-api.internetcomputer.org/search/transactions", {
        body: JSON.stringify({
          limit: PAGE_SIZE,
          network_identifier: {
            blockchain: "Internet Computer",
            network: "00000000000000020101",
          },
          account_identifier: {
            address: accountId,
          },
        }),
        method: "POST",
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
      })
        .then((res) => res.json())
        .then((json: TransactionResult) => {
          const formatted = {
            total_count: json.total_count,
            transactions: json.transactions.reverse().map((tx) => {
              const type = tx.transaction.operations[0].type;
              let from, to, amount, fee;
              if (type === "TRANSACTION") {
                let fromOp = tx.transaction.operations.find(
                  (op) =>
                    op.type === "TRANSACTION" && op.amount.value.startsWith("-")
                );
                let toOp = tx.transaction.operations.find(
                  (op) =>
                    op.type === "TRANSACTION" &&
                    !op.amount.value.startsWith("-")
                );
                if (!fromOp) {
                  fromOp = tx.transaction.operations[0];
                  toOp = tx.transaction.operations[1];
                }
                from = fromOp.account.address;
                const feeOp = tx.transaction.operations.find(
                  (op) => op.type === "FEE"
                );
                to = toOp.account.address;
                amount = toOp.amount;
                fee = feeOp.amount;
              } else if (type === "MINT") {
                from = type;
                to = tx.transaction.operations[0].account.address;
                amount = tx.transaction.operations[0].amount;
              } else if (type === "BURN") {
                from = tx.transaction.operations[0].account.address;
                to = type;
                amount = tx.transaction.operations[0].amount;
              }

              return {
                ...tx.transaction.metadata,
                type,
                block_hash: tx.block_identifier.hash,
                tx_hash: tx.transaction.transaction_identifier.hash,
                from,
                to,
                amount,
                fee,
              };
            }),
          };
          console.log(formatted);
          setTxs(formatted);
          setIsLoadingTxs(false);
        });
    }
  }, [accountId]);

  useEffect(() => {
    fetch("/data/json/accounts.json")
      .then((res) => res.json())
      .then((json) => {
        setAccounts(json);
      });
  }, []);

  const maxPage = txs ? Math.floor(txs.total_count / PAGE_SIZE) : null;

  return isValid ? (
    <div className="py-16">
      <MetaTitle title={`Account${accountId ? ` ${accountId}` : ""}`} />
      <h1 className="text-3xl mb-8 overflow-hidden overflow-ellipsis">
        Account <small className="text-2xl">{accountId}</small>
      </h1>
      <table className="w-full table-fixed">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr className="invisible">
            <td className="w-1/4" />
            <td className="w-3/4" />
          </tr>
          <tr>
            <th colSpan={2} className="px-2 py-2">
              Account Details
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
          <tr>
            <td className="px-2 py-2 w-1/4">Balance</td>
            <td className="px-2 py-2 w-3/4">
              {balance != null ? (
                <>
                  {formatNumber(Number(balance) / 1e8)}{" "}
                  <span className="text-xs">ICP</span>
                </>
              ) : (
                "-"
              )}
            </td>
          </tr>
          <tr>
            <td className="px-2 py-2 w-1/4">Transactions</td>
            <td className="px-2 py-2 w-3/4">
              {txs ? formatNumber(txs.total_count) : null}
            </td>
          </tr>
          <tr>
            <td className="px-2 py-2 w-1/4">Name</td>
            <td className="px-2 py-2 w-3/4">
              {accounts[accountId] || (
                <span className="inline-flex items-center">
                  Unknown{" "}
                  <a
                    className="ml-2 inline-flex items-center text-blue-600 hover:underline"
                    href={`${GITHUB_REPO}/edit/main/public/data/json/accounts.json`}
                    target="_blank"
                  >
                    <BiPencil /> Edit
                  </a>
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full table-fixed mt-8">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="text-left px-2 py-2 w-1/6">Tx Hash</th>
            <th className="text-left px-2 py-2 w-1/6">Timestamp</th>
            <th className="text-left px-2 py-2 w-1/6">From</th>
            <th className="text-left px-2 py-2 w-1/6">To</th>
            <th className="text-left px-2 py-2 w-1/6">Amount</th>
            <th className="text-left px-2 py-2 w-1/6">Fee</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
          {isLoadingTxs ? (
            <tr>
              <td
                colSpan={6}
                className="text-center py-2 italic text-gray-600 dark:text-gray-400"
              >
                Loading...
              </td>
            </tr>
          ) : txs ? (
            txs.total_count > 0 ? (
              txs.transactions
                .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                .map((tx) => {
                  return (
                    <tr key={tx.tx_hash}>
                      <td className="px-2 py-2 overflow-hidden overflow-ellipsis text-blue-600">
                        <Link href={`/transaction/${tx.tx_hash}`}>
                          <a className="hover:underline">{tx.tx_hash}</a>
                        </Link>
                      </td>
                      <td className="px-2 py-2 overflow-hidden overflow-ellipsis">
                        {DateTime.fromMillis(tx.timestamp / 1e6).toRelative()}
                      </td>
                      <td
                        className={classnames(
                          "px-2 py-2 overflow-hidden overflow-ellipsis",
                          {
                            "text-blue-600":
                              tx.type !== "MINT" && tx.from !== accountId,
                          }
                        )}
                      >
                        {tx.type === "MINT" ? (
                          <TransactionTypeLabel type={tx.type} />
                        ) : tx.from === accountId ? (
                          tx.from
                        ) : (
                          <Link href={`/account/${tx.from}`}>
                            <a className="hover:underline">
                              {accounts[tx.from] || tx.from}
                            </a>
                          </Link>
                        )}
                      </td>
                      <td
                        className={classnames(
                          "px-2 py-2 overflow-hidden overflow-ellipsis",
                          {
                            "text-blue-600":
                              tx.type !== "BURN" && tx.to !== accountId,
                          }
                        )}
                      >
                        {tx.type === "BURN" ? (
                          <TransactionTypeLabel type={tx.type} />
                        ) : tx.to === accountId ? (
                          tx.to
                        ) : (
                          <Link href={`/account/${tx.to}`}>
                            <a className="hover:underline">
                              {accounts[tx.to] || tx.to}
                            </a>
                          </Link>
                        )}
                      </td>
                      <td className="px-2 py-2 overflow-hidden overflow-ellipsis">
                        {formatNumber(
                          Math.abs(Number(tx.amount.value)) /
                            10 ** tx.amount.currency.decimals
                        )}{" "}
                        <span className="text-xs">
                          {tx.amount.currency.symbol}
                        </span>
                      </td>
                      <td className="px-2 py-2 overflow-hidden overflow-ellipsis">
                        {tx.fee
                          ? formatNumber(
                              Math.abs(Number(tx.fee.value)) /
                                10 ** tx.fee.currency.decimals
                            )
                          : 0}{" "}
                        <span className="text-xs">ICP</span>
                      </td>
                    </tr>
                  );
                })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-2 italic text-gray-600 dark:text-gray-400"
                >
                  No transactions found.
                </td>
              </tr>
            )
          ) : null}
        </tbody>
      </table>
      {maxPage ? (
        <div className="flex justify-center py-2">
          <div className="flex gap-x-1">
            <button
              disabled={page <= 0}
              className={classnames(
                "px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 transition-colors",
                {
                  "text-gray-300 dark:text-gray-700 cursor-default": page <= 0,
                  "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700":
                    page > 0,
                }
              )}
              onClick={() => setPage(0)}
            >
              <FiChevronsLeft />
            </button>
            <button
              disabled={page <= 0}
              className={classnames(
                "px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 transition-colors",
                {
                  "text-gray-300 dark:text-gray-700 cursor-default": page <= 0,
                  "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700":
                    page > 0,
                }
              )}
              onClick={() => setPage(page - 1)}
            >
              <FiChevronLeft />
            </button>
            <span className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
              Page {page + 1} of {maxPage + 1}
            </span>
            <button
              disabled={page >= maxPage}
              className={classnames(
                "px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 transition-colors",
                {
                  "text-gray-300 dark:text-gray-600 cursor-default":
                    page >= maxPage,
                  "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700":
                    page < maxPage,
                }
              )}
              onClick={() => setPage(page + 1)}
            >
              <FiChevronRight />
            </button>
            <button
              disabled={page >= maxPage}
              className={classnames(
                "px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 transition-colors",
                {
                  "text-gray-300 dark:text-gray-600 cursor-default":
                    page >= maxPage,
                  "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700":
                    page < maxPage,
                }
              )}
              onClick={() => setPage(maxPage)}
            >
              <FiChevronsRight />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  ) : (
    <Search404 input={accountId} />
  );
};

export default Account;
