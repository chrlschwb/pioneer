import { BN } from '@polkadot/util'
import { useEffect, useState } from 'react'
import { of, map, switchMap, Observable, combineLatest } from 'rxjs'

import { encodeAddress } from '@/accounts/model/encodeAddress'
import { Api } from '@/api'
import { useApi } from '@/api/hooks/useApi'
import { ERAS_PER_YEAR } from '@/common/constants'
import { useFirstObservableValue } from '@/common/hooks/useFirstObservableValue'
import { last } from '@/common/utils'

import { Verification, State, Validator, ValidatorMembership } from '../types'

import { useValidatorMembers } from './useValidatorMembers'

export const useValidatorsList = () => {
  const { api } = useApi()
  const [search, setSearch] = useState('')
  const [isVerified, setIsVerified] = useState<Verification>(null)
  const [isActive, setIsActive] = useState<State>(null)
  const [visibleValidators, setVisibleValidators] = useState<Validator[]>([])
  const validatorsWithMembership = useValidatorMembers()

  const getValidatorInfo = (address: string, api: Api): Observable<Validator> => {
    const activeValidators$ = api.query.session.validators()
    const stakingInfo$ = api.query.staking
      .activeEra()
      .pipe(switchMap((activeEra) => api.query.staking.erasStakers(activeEra.unwrap().index, address)))
    const rewardHistory$ = api.derive.staking.stakerRewards(address)
    const validatorInfo$ = api.query.staking.validators(address)
    return combineLatest([activeValidators$, stakingInfo$, rewardHistory$, validatorInfo$]).pipe(
      map(([activeValidators, stakingInfo, rewardHistory, validatorInfo]) => {
        const encodedAddress = encodeAddress(address)
        const apr =
          rewardHistory.length && !stakingInfo.total.toBn().isZero()
            ? last(rewardHistory)
                .eraReward.toBn()
                .muln(ERAS_PER_YEAR)
                .mul(validatorInfo.commission.toBn())
                .div(stakingInfo.total.toBn())
                .divn(10 ** 7) // Convert from Perbill to Percent
                .toNumber()
            : 0
        const validatorMembership = validatorsWithMembership?.find(({ stashAccount }) => stashAccount === address)
        return {
          member: validatorMembership?.membership,
          address: encodedAddress,
          isVerified: validatorMembership?.isVerifiedValidator,
          isActive: activeValidators.includes(address),
          totalRewards: rewardHistory.reduce((total: BN, data) => total.add(data.eraReward), new BN(0)),
          APR: apr,
        }
      })
    )
  }

  const getValidatorsInfo = (api: Api, validatorsWithMembership: ValidatorMembership[]) => {
    const validatorAddresses = validatorsWithMembership.map(({ stashAccount }) => stashAccount)
    const validatorInfoObservables = validatorAddresses.map((address) => getValidatorInfo(address, api))
    return combineLatest(validatorInfoObservables)
  }

  const allValidators = useFirstObservableValue(
    () => (api && validatorsWithMembership ? getValidatorsInfo(api, validatorsWithMembership) : of([])),
    [api?.isConnected, validatorsWithMembership]
  )

  useEffect(() => {
    if (allValidators) {
      setVisibleValidators(
        allValidators
          .filter((validator) => {
            if (isActive === 'active') return validator.isActive
            else if (isActive === 'waiting') return !validator.isActive
            else return true
          })
          .filter((validator) => {
            if (isVerified === 'verified') return validator.isVerified
            else if (isVerified === 'unverified') return !validator.isVerified
            else return true
          })
          .filter((validator) => {
            return validator.address.includes(search) || validator.member?.handle.includes(search)
          })
      )
    }
  }, [allValidators, search, isVerified, isActive])

  return {
    visibleValidators,
    length: visibleValidators.length,
    filter: {
      search,
      setSearch,
      isVerified,
      setIsVerified,
      isActive,
      setIsActive,
    },
  }
}
