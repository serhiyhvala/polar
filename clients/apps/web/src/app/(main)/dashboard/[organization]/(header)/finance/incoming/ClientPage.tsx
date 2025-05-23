'use client'

import AccountBalance from '@/components/Transactions/AccountBalance'
import AccountBanner from '@/components/Transactions/AccountBanner'
import PayoutTransactionsList from '@/components/Transactions/PayoutTransactionsList'
import TransactionsList from '@/components/Transactions/TransactionsList'
import { useOrganizationAccount, useSearchTransactions } from '@/hooks/queries'
import {
  DataTablePaginationState,
  DataTableSortingState,
  getAPIParams,
  serializeSearchParams,
} from '@/utils/datatable'
import { schemas } from '@polar-sh/client'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@polar-sh/ui/components/atoms/Tabs'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export default function ClientPage({
  pagination,
  sorting,
  organization,
}: {
  pagination: DataTablePaginationState
  sorting: DataTableSortingState
  organization: schemas['Organization']
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const setActiveTab = useCallback(
    (value: string) => {
      router.replace(
        `/dashboard/${organization.slug}/finance/incoming?type=${value}`,
      )
    },
    [organization, router],
  )

  const setPagination = (
    updaterOrValue:
      | DataTablePaginationState
      | ((old: DataTablePaginationState) => DataTablePaginationState),
  ) => {
    const updatedPagination =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(pagination)
        : updaterOrValue

    router.push(
      `${pathname}?${serializeSearchParams(updatedPagination, sorting)}`,
    )
  }

  const setSorting = (
    updaterOrValue:
      | DataTableSortingState
      | ((old: DataTableSortingState) => DataTableSortingState),
  ) => {
    const updatedSorting =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(sorting)
        : updaterOrValue

    router.push(
      `${pathname}?${serializeSearchParams(pagination, updatedSorting)}`,
    )
  }

  const { data: organizationAccount, isLoading: accountIsLoading } =
    useOrganizationAccount(organization.id)

  const balancesHook = useSearchTransactions({
    account_id: organizationAccount?.id,
    type: 'balance',
    exclude_platform_fees: true,
    ...getAPIParams(pagination, sorting),
  })
  const balances = balancesHook.data?.items || []
  const balancesCount = balancesHook.data?.pagination.max_page ?? 1

  const payoutsHooks = useSearchTransactions({
    account_id: organizationAccount?.id,
    type: 'payout',
    ...getAPIParams(pagination, sorting),
  })
  const refetchPayouts = payoutsHooks.refetch
  const payouts = payoutsHooks.data?.items || []
  const payoutsCount = payoutsHooks.data?.pagination.max_page ?? 1

  const onWithdrawSuccess = useCallback(async () => {
    await refetchPayouts()
  }, [refetchPayouts])

  return (
    <div className="flex flex-col gap-y-6">
      <AccountBanner organization={organization} />

      {organizationAccount && (
        <AccountBalance
          account={organizationAccount}
          onWithdrawSuccess={onWithdrawSuccess}
        />
      )}

      <Tabs
        defaultValue={params?.get('type') ?? 'transactions'}
        onValueChange={setActiveTab}
      >
        <div className="mb-8 flex flex-col gap-y-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-y-2">
            <h2 className="text-lg font-medium capitalize">
              {params?.get('type') ?? 'Transactions'}
            </h2>
            <p className="dark:text-polar-500 text-sm text-gray-500">
              {params?.get('type') === 'payouts'
                ? 'Made from your account to your bank account'
                : 'Made from Polar to your account'}
            </p>
          </div>

          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="transactions">
          <TransactionsList
            transactions={balances}
            pageCount={balancesCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={accountIsLoading || balancesHook.isLoading}
          />
        </TabsContent>
        <TabsContent value="payouts">
          <PayoutTransactionsList
            transactions={payouts}
            pageCount={payoutsCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={accountIsLoading || payoutsHooks.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
