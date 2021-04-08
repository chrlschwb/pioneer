import { SubmittableExtrinsic } from '@polkadot/api/types'
import { ISubmittableResult } from '@polkadot/types/types'
import BN from 'bn.js'
import React, { useEffect, useState } from 'react'

import { SelectedAccount } from '../../../accounts/components/SelectAccount'
import { useAccounts } from '../../../accounts/hooks/useAccounts'
import { useBalance } from '../../../accounts/hooks/useBalance'
import { accountOrNamed } from '../../../accounts/model/accountOrNamed'
import { ButtonPrimary } from '../../../common/components/buttons'
import { InputComponent } from '../../../common/components/forms'
import { Help } from '../../../common/components/Help'
import { ModalBody, ModalFooter } from '../../../common/components/Modal'
import { BalanceInfoNarrow, InfoTitle, InfoValue, Row } from '../../../common/components/Modals'
import { TransactionModal } from '../../../common/components/TransactionModal'
import { TextMedium, TokenValue } from '../../../common/components/typography'
import { useSignAndSendTransaction } from '../../../common/hooks/useSignAndSendTransaction'
import { Address, onTransactionDone } from '../../../common/types'
import { Member } from '../../types'

interface SignProps {
  onClose: () => void
  transactionParams: Member
  onDone: onTransactionDone
  transaction: SubmittableExtrinsic<'rxjs', ISubmittableResult> | undefined
  signer: Address
}

const getMessage = (fee?: BN) => {
  return `Insufficient funds to cover the membership creation. You need at least ${fee?.toString()} JOY on your controller account for this action.
Please choose different member.`
}

export const InviteMemberSignModal = ({ onClose, transactionParams, onDone, transaction, signer }: SignProps) => {
  const { allAccounts } = useAccounts()
  const signerAccount = accountOrNamed(allAccounts, signer, 'ControllerAccount')
  const { paymentInfo, send, status } = useSignAndSendTransaction({
    transaction,
    signer: signer,
    onDone,
  })
  const [hasFunds, setHasFunds] = useState(false)
  const balance = useBalance(signer)
  const transferable = balance?.transferable
  const partialFee = paymentInfo?.partialFee

  useEffect(() => {
    if (transferable && partialFee) {
      setHasFunds(transferable.gte(partialFee))
    }
  }, [partialFee?.toString(), transferable?.toString()])

  const signDisabled = status !== 'READY' || !hasFunds

  return (
    <TransactionModal status={status} onClose={onClose}>
      <ModalBody>
        <TextMedium>You intend to create a new membership.</TextMedium>
        <TextMedium>
          You are inviting this member. You have {transactionParams.invitor?.inviteCount.toString()} invites left.
        </TextMedium>
        <TextMedium>
          Fees of <TokenValue value={partialFee?.toBn()} /> will be applied to the transaction.
        </TextMedium>
        <Row>
          <InputComponent
            label="Sending from account"
            inputSize="l"
            validation={hasFunds ? undefined : 'invalid'}
            message={hasFunds ? undefined : getMessage(partialFee)}
          >
            <SelectedAccount account={signerAccount} />
          </InputComponent>
        </Row>
      </ModalBody>
      <ModalFooter>
        <BalanceInfoNarrow>
          <InfoTitle>Transaction fee:</InfoTitle>
          <InfoValue>
            <TokenValue value={partialFee?.toBn()} />
          </InfoValue>
          <Help helperText={'Lorem ipsum dolor sit amet consectetur, adipisicing elit.'} absolute />
        </BalanceInfoNarrow>
        <ButtonPrimary size="medium" onClick={send} disabled={signDisabled}>
          Sign and create a member
        </ButtonPrimary>
      </ModalFooter>
    </TransactionModal>
  )
}