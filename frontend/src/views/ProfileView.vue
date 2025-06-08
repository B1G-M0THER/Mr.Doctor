<template>
  <div class="page">
    <h1>Профіль користувача</h1>

    <div v-if="user" class="user-info">
      <p><strong>Ім'я:</strong> {{ user.name }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>Телефон:</strong> {{ user.phone_number }}</p>
    </div>
    <div v-else-if="isLoadingUser"> <p>Завантаження даних користувача...</p>
    </div>
    <div v-else>
      <p>Не вдалося завантажити дані користувача.</p> </div>

    <h2>Ваша картка</h2>
    <div v-if="isLoadingCard"><p>Завантаження даних картки...</p></div>
    <div v-else-if="activeCard && user">
      <BankCard
          :card-number="activeCard.card_number"
          :card-holder-name="user.name"
          :cvv="activeCard.cvv"
          :expiry-date="activeCard.dueDate"
          :balance="activeCard.balance"
          :status="activeCard.status" />
      <div class="card-actions" v-if="activeCard">
        <button
            v-if="activeCard.status === 'active'"
            @click="openTransferModal"
            class="action-button transfer-button">
          Переказати кошти
        </button>
        <button
            v-if="activeCard.status === 'expired'"
            @click="openRenewCardModal"
            class="action-button renew-button">
          Поновити картку
        </button>
        <p v-if="activeCard.status === 'renewal_pending'" class="status-message pending">
          Ваша картка очікує підтвердження поновлення адміністратором. Номер: ...{{ activeCard.card_number.slice(-4) }}, дійсна до: {{ activeCard.dueDate }}.
        </p>
        <p v-if="activeCard.status === 'expired'" class="status-message error">
          Термін дії вашої картки закінчився. Будь ласка, поновіть її.
        </p>
        <p v-if="activeCard.status === 'blocked'" class="status-message error">
          Ваша картка заблокована. Зверніться до підтримки.
        </p>
        <p v-if="activeCard.status === 'waiting'" class="status-message pending">
          Ваша картка очікує первинної активації адміністратором.
        </p>
      </div>
    </div>
    <div v-else>
      <p>У вас немає активних карток або не вдалося завантажити дані картки. <router-link to="/open-card">Відкрити картку?</router-link></p>
    </div>

    <div v-if="showTransferModal" class="modal-overlay" @click.self="closeTransferModal">
      <div class="modal-content">
        <span class="close-icon" @click="closeTransferModal">&times;</span>
        <h3>Переказ коштів з картки</h3>
        <div v-if="activeCard" class="transfer-from-info">
          <p>З картки: ...{{ activeCard.card_number.slice(-4) }}</p>
          <p>Поточний баланс: {{ activeCard.balance.toFixed(2) }} UAH</p>
        </div>
        <form @submit.prevent="handleTransferSubmit">
          <div class="form-group">
            <label for="receiverCardNumber">Номер картки отримувача:</label>
            <input type="text" id="receiverCardNumber" v-model="transferData.receiverCardNumber" @input="formatReceiverCardNumber" placeholder="0000 0000 0000 0000" maxlength="19" required />
          </div>
          <div class="form-group">
            <label for="transferAmount">Сума переказу (UAH):</label>
            <input type="number" id="transferAmount" v-model.number="transferData.amount" placeholder="Наприклад, 100" step="0.01" min="1" required />
          </div>
          <div class="form-group">
            <label for="senderCVV">Ваш CVV (з картки ...{{ activeCard ? activeCard.card_number.slice(-4) : '' }}):</label>
            <input type="password" id="senderCVV" v-model.trim="transferData.senderCVV" placeholder="XXX" maxlength="3" required />
          </div>
          <div class="form-group">
            <label for="senderPIN">Ваш PIN-код картки:</label>
            <input type="password" id="senderPIN" v-model.trim="transferData.senderPIN" placeholder="XXXX" maxlength="4" required />
          </div>
          <div v-if="transferError" class="error-message">{{ transferError }}</div>
          <div v-if="transferSuccessMessage" class="success-message">{{ transferSuccessMessage }}</div>
          <button type="submit" class="submit-button" :disabled="transferLoading">
            {{ transferLoading ? 'Обробка...' : 'Переказати' }}
          </button>
        </form>
      </div>
    </div>

    <div v-if="showRenewCardModal" class="modal-overlay" @click.self="closeRenewCardModal">
      <div class="modal-content">
        <span class="close-icon" @click="closeRenewCardModal">&times;</span>
        <h3>Поновлення картки</h3>
        <p>Для поновлення картки, будь ласка, встановіть новий 4-значний PIN-код. Номер картки, CVV та термін дії будуть оновлені автоматично.</p>
        <form @submit.prevent="handleRenewCardSubmit">
          <div class="form-group">
            <label for="newPin">Новий PIN-код (4 цифри):</label>
            <input type="password" id="newPin" v-model.trim="renewalData.newPin" placeholder="XXXX" maxlength="4" minlength="4" required />
          </div>
          <div v-if="renewalError" class="error-message">{{ renewalError }}</div>
          <div v-if="renewalSuccessMessage" class="success-message">{{ renewalSuccessMessage }}</div>
          <button type="submit" class="submit-button" :disabled="renewalLoading">
            {{ renewalLoading ? 'Обробка...' : 'Запросити поновлення' }}
          </button>
        </form>
      </div>
    </div>

    <div class="user-loans-section">
      <h2>Мої кредити</h2>
      <div v-if="isLoadingLoans" class="loading-message"><p>Завантаження інформації про кредити...</p></div>
      <div v-else-if="loansError" class="error-message">{{ loansError }}</div>
      <div v-else-if="!userLoans || userLoans.length === 0" class="no-requests">
        <p>У вас немає оформлених кредитів. <router-link to="/credit">Подати заявку на кредит?</router-link></p>
      </div>
      <div v-else class="loans-grid">
        <div v-for="loan in userLoans" :key="loan.id" class="loan-item" :class="`loan-status-${loan.status}`">
          <h3>Кредит #{{ loan.id }} <span class="status-badge">{{ getLoanStatusText(loan.status) }}</span></h3>
          <div class="loan-details">
            <p><strong>Сума кредиту:</strong> {{ loan.amount.toFixed(2) }} UAH</p>
            <p><strong>Відсоткова ставка:</strong> {{ loan.interest_rate.toFixed(2) }}% річних</p>
            <p><strong>Термін:</strong> {{ loan.term }} місяців</p>
            <p><strong>Дата видачі/заявки:</strong> {{ loan.activated_at ? new Date(loan.activated_at).toLocaleDateString('uk-UA') : (loan.status === 'waiting' || loan.status === 'rejected' ? new Date(loan.created_at).toLocaleDateString('uk-UA') : 'N/A') }}</p>

            <template v-if="loan.status === 'active'">
              <p><strong>Щомісячний платіж:</strong> {{ loan.monthly_payment_amount ? loan.monthly_payment_amount.toFixed(2) : 'Розраховується...' }} UAH</p>
              <p><strong>Залишилось сплатити (всього з %):</strong> <span v-if="loan.monthly_payment_amount && loan.term">{{ formatDisplayedDebt((loan.monthly_payment_amount * loan.term) - (loan.paid_amount || 0)) }} UAH</span><span v-else>Розраховується...</span></p>
              <p><strong>Наступний платіж до:</strong> {{ loan.next_payment_due_date ? new Date(loan.next_payment_due_date).toLocaleDateString('uk-UA') : 'N/A' }}</p>
              <p><strong>Вже сплачено:</strong> {{ loan.paid_amount ? loan.paid_amount.toFixed(2) : '0.00' }} UAH</p>
              <p v-if="loan.last_payment_date"><strong>Останній платіж:</strong> {{ new Date(loan.last_payment_date).toLocaleDateString('uk-UA') }}</p>
              <button @click="openLoanPaymentModal(loan)" class="action-button pay-loan-button">Здійснити платіж</button>
            </template>

            <template v-if="loan.status === 'unpaid'">
              <p class="info-text error"><strong>Кредит прострочено!</strong></p>
              <p><strong>Залишок основного боргу:</strong> {{ loan.outstanding_principal ? loan.outstanding_principal.toFixed(2) : 'N/A' }} UAH</p>
              <p><strong>Нарахований штраф:</strong> <strong style="color: #ff6b6b;">{{ loan.accrued_penalty ? loan.accrued_penalty.toFixed(2) : '0.00' }} UAH</strong></p>
              <p><strong>Пропущена дата платежу:</strong> {{ loan.next_payment_due_date ? new Date(loan.next_payment_due_date).toLocaleDateString('uk-UA') : 'N/A' }}</p>
              <button v-if="loan.accrued_penalty && loan.accrued_penalty > 0" @click="openPayPenaltyModal(loan)" class="action-button pay-penalty-button">Сплатити штраф</button>
              <p v-else class="info-text">Зверніться до підтримки для врегулювання заборгованості.</p>
            </template>


            <p v-if="loan.status === 'waiting'" class="info-text">Заявка на розгляді.</p>
            <div v-if="loan.status === 'closed' || loan.status === 'rejected'" class="loan-actions-closed-rejected">
              <p v-if="loan.status === 'closed'" class="info-text success">Кредит повністю погашено.</p>
              <p v-if="loan.status === 'rejected'" class="info-text error">Заявку на кредит відхилено.</p>
              <button @click="openDeleteLoanModal(loan)" class="action-button delete-loan-history-button" :disabled="isDeletingLoan && loanToDelete && loanToDelete.id === loan.id">
                {{ (isDeletingLoan && loanToDelete && loanToDelete.id === loan.id) ? 'Видалення...' : 'Видалити з історії' }}
              </button>
            </div>
          </div>

          <div v-if="loan.LoanPayments && loan.LoanPayments.length > 0" class="loan-payments-history">
            <h4>Останні платежі:</h4>
            <ul>
              <li v-for="payment in loan.LoanPayments.slice(0, 3)" :key="payment.id">
                {{ new Date(payment.payment_date).toLocaleDateString('uk-UA') }}:
                <strong>{{ payment.amount_paid.toFixed(2) }} UAH</strong>
                (Тіло: {{payment.principal_paid.toFixed(2)}}, Відсотки: {{payment.interest_paid.toFixed(2)}})
              </li>
              <li v-if="loan.LoanPayments.length > 3">... та ще {{loan.LoanPayments.length - 3 }} платежів</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showLoanPaymentModal && selectedLoanForPayment" class="modal-overlay" @click.self="closeLoanPaymentModal">
      <div class="modal-content">
        <span class="close-icon" @click="closeLoanPaymentModal">&times;</span>
        <h3>Погашення кредиту #{{ selectedLoanForPayment.id }}</h3>
        <div class="loan-payment-details">
          <p><strong>Залишок основного боргу:</strong> {{ selectedLoanForPayment.outstanding_principal ? selectedLoanForPayment.outstanding_principal.toFixed(2) : '0.00' }} UAH</p>
          <p><strong>Сума до сплати:</strong> <strong style="color: #42b983;">{{ paymentData.amountToPayDisplay ? paymentData.amountToPayDisplay.toFixed(2) : 'Розрахунок...' }} UAH</strong></p>
          <p v-if="activeCard"><strong>Баланс вашої картки:</strong> {{ activeCard.balance.toFixed(2) }} UAH</p>
        </div>
        <div v-if="activeCard && activeCard.status !== 'active'" class="error-message" style="margin-bottom: 15px;">
          <span v-if="activeCard.status === 'expired'">Платіж неможливий: термін дії вашої картки закінчився.</span>
          <span v-else-if="activeCard.status === 'blocked'">Платіж неможливий: ваша картка заблокована.</span>
          <span v-else>Платіж неможливий: ваша картка не активна (статус: {{ activeCard.status }}).</span>
        </div>
        <form @submit.prevent="handleLoanPayment">
          <div v-if="paymentError" class="error-message">{{ paymentError }}</div>
          <div v-if="paymentSuccessMessage" class="success-message">{{ paymentSuccessMessage }}</div>
          <button type="submit" class="submit-button" :disabled="isProcessingPayment || !paymentData.amountToPayDisplay || paymentData.amountToPayDisplay <=0 || (activeCard && activeCard.status !== 'active')">
            {{ isProcessingPayment ? 'Обробка...' : (paymentData.amountToPayDisplay && activeCard && activeCard.balance < paymentData.amountToPayDisplay ? 'Недостатньо коштів' : 'Сплатити') }}
          </button>
        </form>
      </div>
    </div>

    <div v-if="showPayPenaltyModal && penaltyToPayDetails" class="modal-overlay" @click.self="closePayPenaltyModal">
      <div class="modal-content">
        <span class="close-icon" @click="closePayPenaltyModal">&times;</span>
        <h3>Сплата штрафу по кредиту #{{ penaltyToPayDetails.id }}</h3>
        <div class="loan-payment-details">
          <p><strong>Сума нарахованого штрафу:</strong> <strong style="color: #ff6b6b;">{{ penaltyToPayDetails.accrued_penalty ? penaltyToPayDetails.accrued_penalty.toFixed(2) : '0.00' }} UAH</strong></p>
          <p v-if="activeCard"><strong>Баланс вашої картки:</strong> {{ activeCard.balance.toFixed(2) }} UAH</p>
          <p style="font-size: 0.9em; margin-top: 10px;">Після сплати штрафу статус кредиту буде змінено на "Активний", а наступна дата платежу буде встановлена через 3 дні.</p>
        </div>
        <div v-if="activeCard && activeCard.status !== 'active'" class="error-message" style="margin-bottom: 15px;">
          <span v-if="activeCard.status === 'expired'">Сплата штрафу неможлива: термін дії вашої картки закінчився.</span>
          <span v-else-if="activeCard.status === 'blocked'">Сплата штрафу неможлива: ваша картка заблокована.</span>
          <span v-else>Сплата штрафу неможлива: ваша картка не активна (статус: {{ activeCard.status }}).</span>
        </div>
        <form @submit.prevent="handlePayPenalty">
          <div v-if="payPenaltyError" class="error-message">{{ payPenaltyError }}</div>
          <div v-if="payPenaltySuccessMessage" class="success-message">{{ payPenaltySuccessMessage }}</div>
          <button type="submit" class="submit-button pay-penalty-submit-btn" :disabled="isPayingPenalty || !penaltyToPayDetails.accrued_penalty || penaltyToPayDetails.accrued_penalty <= 0 || (activeCard && activeCard.status !== 'active')">
            {{ isPayingPenalty ? 'Обробка...' : (activeCard && penaltyToPayDetails.accrued_penalty && activeCard.balance < penaltyToPayDetails.accrued_penalty ? 'Недостатньо коштів' : 'Сплатити штраф') }}
          </button>
        </form>
      </div>
    </div>

    <div class="currency-converter-section compact">
      <h2>Конвертер валют</h2>
      <div v-if="isLoadingCurrencies" class="loading-message compact-loading">Завантаження списку валют...</div>
      <div v-else-if="currencyApiError" class="error-message compact-error">{{ currencyApiError }}</div>
      <form v-else @submit.prevent="handleCurrencyConversion" class="converter-form compact">
        <div class="form-row compact-row">
          <div class="form-group compact-group amount-group">
            <label for="amountToConvert">Сума:</label>
            <input type="number" id="amountToConvert" v-model.number="conversionRequest.amount" placeholder="100" step="any" min="0.01" required />
          </div>
          <div class="form-group compact-group currency-group">
            <label for="sourceCurrency">З валюти:</label>
            <select id="sourceCurrency" v-model="conversionRequest.from" required>
              <option disabled value="">Обрати</option>
              <option v-for="currencyCode in supportedCurrencies" :key="currencyCode" :value="currencyCode">
                {{ currencyCode }}
              </option>
            </select>
          </div>
          <div class="form-group compact-group currency-group">
            <label for="targetCurrency">В валюту:</label>
            <select id="targetCurrency" v-model="conversionRequest.to" required>
              <option disabled value="">Обрати</option>
              <option v-for="currencyCode in supportedCurrencies" :key="currencyCode" :value="currencyCode">
                {{ currencyCode }}
              </option>
            </select>
          </div>
          <div class="form-group compact-group button-group">
            <button type="submit" class="submit-button convert-button compact-button" :disabled="isLoadingConversion">
              {{ isLoadingConversion ? '...' : 'Конверт.' }}
            </button>
          </div>
        </div>
      </form>
      <div v-if="conversionResult.convertedAmount !== null && !conversionResult.error" class="conversion-result compact-result">
        <p><strong>{{ conversionResult.originalAmount }} {{ conversionRequest.from }} ≈ {{ conversionResult.convertedAmount.toFixed(2) }} {{ conversionRequest.to }}</strong></p>
        <p v-if="conversionResult.rate" class="rate-info compact-rate">(1 {{ conversionRequest.from }} ≈ {{ conversionResult.rate.toFixed(4) }} {{ conversionRequest.to }} станом на {{ conversionResult.date }})</p>
      </div>
      <div v-if="conversionResult.error" class="error-message conversion-error-display compact-error">
        {{ conversionResult.error }}
      </div>
    </div>
  </div>

  <div v-if="showDeleteLoanModal && loanToDelete" class="modal-overlay" @click.self="closeDeleteLoanModal">
    <div class="modal-content delete-confirmation-modal">
      <span class="close-icon" @click="closeDeleteLoanModal">&times;</span>
      <h3>Підтвердження видалення</h3>
      <p>Ви впевнені, що хочете видалити історію кредиту <strong>#{{ loanToDelete.id }}</strong>?</p>
      <p>Ця дія видалить інформацію про кредит та всі пов'язані з ним платежі. <strong>Цю дію неможливо буде скасувати.</strong></p>
      <div v-if="deleteLoanError" class="error-message">{{ deleteLoanError }}</div>
      <div class="modal-actions">
        <button @click="confirmDeleteLoan" class="submit-button delete-confirm-btn" :disabled="isDeletingLoan">
          {{ isDeletingLoan ? 'Видалення...' : 'Так, видалити' }}
        </button>
        <button @click="closeDeleteLoanModal" class="submit-button cancel-btn" :disabled="isDeletingLoan">
          Скасувати
        </button>
      </div>
    </div>
  </div>

  <div class="user-deposits-section">
    <h2>Мої депозити</h2>
    <div v-if="depositStore.isLoading" class="loading-message"><p>Завантаження інформації про депозити...</p></div>
    <div v-else-if="depositStore.error && !userDepositsFromStore.length" class="error-message">{{ depositStore.error }}</div>
    <div v-else-if="!userDepositsFromStore || userDepositsFromStore.length === 0" class="no-requests">
      <p>У вас немає відкритих депозитів. <router-link to="/deposit">Відкрити депозит?</router-link></p>
    </div>
    <div v-else class="deposits-grid">
      <div v-for="deposit in userDepositsFromStore" :key="deposit.id" class="deposit-item" :class="`deposit-status-${deposit.status}`">
        <template v-if="isDepositMatured(deposit)">
          <h3>Депозит #{{ deposit.id }} <span class="status-badge deposit-status-matured-display">{{ getDepositStatusText('matured') }}</span></h3>
        </template>
        <template v-else>
          <h3>Депозит #{{ deposit.id }} <span class="status-badge">{{ getDepositStatusText(deposit.status) }}</span></h3>
        </template>
        <div class="deposit-details">
          <p><strong>Сума вкладу:</strong> {{ deposit.amount.toFixed(2) }} UAH</p>
          <p><strong>Річна ставка:</strong> {{ deposit.interest_rate.toFixed(2) }}%</p>
          <p><strong>Термін:</strong> {{ deposit.term }} місяців</p>
          <p><strong>Дата заявки:</strong> {{ new Date(deposit.created_at).toLocaleDateString('uk-UA') }}</p>
          <p v-if="deposit.approved_at"><strong>Дата активації:</strong> {{ new Date(deposit.approved_at).toLocaleDateString('uk-UA') }}</p>

          <template v-if="deposit.status === 'active'">
            <p><strong>Поточна сума (з відсотками):</strong> {{ deposit.current_value ? deposit.current_value.toFixed(2) : deposit.amount.toFixed(2) }} UAH</p>
            <p><strong>Нараховано відсотків (до {{ isDepositMatured(deposit) ? new Date(deposit.maturity_date).toLocaleDateString('uk-UA') : 'сьогодні' }}):</strong> {{ deposit.calculated_accrued_interest ? deposit.calculated_accrued_interest.toFixed(2) : '0.00' }} UAH</p>
            <p><strong>Дата завершення:</strong> {{ calculateDepositEndDate(deposit.approved_at, deposit.term) }}</p>
            <button
                v-if="deposit.status === 'active' && !isDepositMatured(deposit)"
                @click="openEarlyWithdrawalModal(deposit)"
                class="action-button withdraw-early-button"
                :disabled="!activeCard || activeCard.status !== 'active'">
              Достроково розірвати
            </button>
            <button
                v-else-if="deposit.status === 'active' && isDepositMatured(deposit)"
                @click="openWithdrawMaturedModal(deposit)"
                class="action-button get-funds-button"
                :disabled="!activeCard || activeCard.status !== 'active'">
              Отримати кошти
            </button>
            <small v-if="activeCard && activeCard.status !== 'active'" class="text-warning d-block mt-2">
              Для дострокового розірвання потрібна активна картка.
            </small>
          </template>

          <p v-if="deposit.status === 'closed_early' || deposit.status === 'closed_by_term'">
            <strong>Дата закриття:</strong> {{ new Date(deposit.closed_at).toLocaleDateString('uk-UA') }}<br/>
            <strong>Виплачено відсотків:</strong> {{ deposit.calculated_accrued_interest ? deposit.calculated_accrued_interest.toFixed(2) : 'N/A' }} UAH<br/>
            <strong>Загальна сума виплати:</strong> {{ deposit.calculated_total_payout ? deposit.calculated_total_payout.toFixed(2) : 'N/A' }} UAH
          </p>
          <p v-if="deposit.status === 'rejected'" class="info-text error">Заявку на депозит відхилено.</p>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showWithdrawMaturedModal && selectedDepositForMaturedWithdrawal" class="modal-overlay" @click.self="closeWithdrawMaturedModal">
    <div class="modal-content">
      <span class="close-icon" @click="closeWithdrawMaturedModal">&times;</span>
      <h3>Отримання коштів по депозиту #{{ selectedDepositForMaturedWithdrawal.id }}</h3>
      <div class="deposit-withdrawal-details">
        <p><strong>Сума вкладу:</strong> {{ selectedDepositForMaturedWithdrawal.amount.toFixed(2) }} UAH</p>
        <p><strong>Нараховані відсотки за весь термін:</strong> {{ selectedDepositForMaturedWithdrawal.calculated_accrued_interest ? selectedDepositForMaturedWithdrawal.calculated_accrued_interest.toFixed(2) : 'Розрахунок...' }} UAH</p>
        <p><strong>Загальна сума до виплати на картку:</strong> <strong style="color: #42b983;">{{ selectedDepositForMaturedWithdrawal.current_value ? selectedDepositForMaturedWithdrawal.current_value.toFixed(2) : 'Розрахунок...' }} UAH</strong></p>
      </div>
      <div v-if="activeCard && activeCard.status !== 'active'" class="error-message" style="margin-bottom: 15px;">
        <span v-if="activeCard.status === 'expired'">Виведення неможливе: термін дії вашої картки закінчився.</span>
        <span v-else-if="activeCard.status === 'blocked'">Виведення неможливе: ваша картка заблокована.</span>
        <span v-else>Виведення неможливе: ваша картка не активна (статус: {{ activeCard.status }}).</span>
      </div>
      <form @submit.prevent="handleWithdrawMatured">
        <div v-if="maturedWithdrawalError || depositStore.error" class="error-message">{{ maturedWithdrawalError || depositStore.error }}</div>
        <div v-if="maturedWithdrawalSuccessMessage || depositStore.withdrawalMessage" class="success-message">{{ maturedWithdrawalSuccessMessage || depositStore.withdrawalMessage }}</div>
        <button
            type="submit"
            class="submit-button confirm-action-btn"
            :disabled="isProcessingMaturedWithdrawal || (activeCard && activeCard.status !== 'active')">
          {{ isProcessingMaturedWithdrawal ? 'Обробка...' : 'Отримати кошти' }}
        </button>
      </form>
    </div>
  </div>

  <div v-if="showEarlyWithdrawalModal && selectedDepositForWithdrawal" class="modal-overlay" @click.self="closeEarlyWithdrawalModal">
    <div class="modal-content">
      <span class="close-icon" @click="closeEarlyWithdrawalModal">&times;</span>
      <h3>Дострокове розірвання депозиту #{{ selectedDepositForWithdrawal.id }}</h3>
      <div class="deposit-withdrawal-details">
        <p><strong>Сума вкладу:</strong> {{ selectedDepositForWithdrawal.amount.toFixed(2) }} UAH</p>
        <p><strong>Нараховані відсотки (до штрафу):</strong> {{ calculatedEarlyWithdrawal.initialInterest.toFixed(2) }} UAH</p>
        <p><strong>Штраф за дострокове розірвання ({{ selectedDepositForWithdrawal.early_withdrawal_penalty_percent || 50 }}% від відсотків):</strong> <span style="color: #ff6b6b;">{{ calculatedEarlyWithdrawal.penaltyAmount.toFixed(2) }} UAH</span></p>
        <p><strong>Відсотки до виплати (після штрафу):</strong> {{ calculatedEarlyWithdrawal.interestToPay.toFixed(2) }} UAH</p>
        <p><strong>Загальна сума до виплати на картку:</strong> <strong style="color: #42b983;">{{ calculatedEarlyWithdrawal.totalPayout.toFixed(2) }} UAH</strong></p>
      </div>
      <div v-if="activeCard && activeCard.status !== 'active'" class="error-message" style="margin-bottom: 15px;">
        <span v-if="activeCard.status === 'expired'">Виведення неможливе: термін дії вашої картки закінчився.</span>
        <span v-else-if="activeCard.status === 'blocked'">Виведення неможливе: ваша картка заблокована.</span>
        <span v-else>Виведення неможливе: ваша картка не активна (статус: {{ activeCard.status }}).</span>
      </div>
      <form @submit.prevent="handleEarlyWithdrawal">
        <div v-if="earlyWithdrawalError" class="error-message">{{ earlyWithdrawalError }}</div>
        <div v-if="earlyWithdrawalSuccessMessage" class="success-message">{{ earlyWithdrawalSuccessMessage }}</div>
        <button
            type="submit"
            class="submit-button confirm-action-btn"
            :disabled="isProcessingEarlyWithdrawal || (activeCard && activeCard.status !== 'active')">
          {{ isProcessingEarlyWithdrawal ? 'Обробка...' : 'Підтвердити розірвання та вивести кошти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import api from '../api.js';
import BankCard from '../components/BankCard.vue';
import { useDepositStore } from "../store/depositStore.js";
import {useUiStore} from "../store/uiStore.js";

export default {
  name: 'ProfileView',
  components: {
    BankCard
  },
  setup(){
    const uiStore = useUiStore();
  },
  data() {
    return {
      user: null,
      activeCard: null,
      isLoadingUser: true,
      isLoadingCard: true,
      showTransferModal: false,
      transferData:{
        receiverCardNumber:'',
        amount: null,
        senderCVV:'',
        senderPIN:'',
      },
      transferError: null,
      transferSuccessMessage: null,
      transferLoading: false,
      showRenewCardModal: false,
      renewalData:{
        newPin: '',
      },
      renewalError: null,
      renewalSuccessMessage: null,
      renewalLoading: false,

      supportedCurrencies: [],
      allRates: {},
      nbuExchangeDate: null,
      isLoadingCurrencies: true,
      currencyApiError: null,
      conversionRequest: {
        amount: null,
        from: 'UAH',
        to: 'USD',
      },
      conversionResult: {
        originalAmount: null,
        convertedAmount: null,
        rate: null,
        date: null,
        error: null,
      },
      isLoadingConversion: false,
      userLoans: [],
      isLoadingLoans: true,
      loansError: null,
      showLoanPaymentModal: false,
      selectedLoanForPayment: null,
      paymentData: {
        amountToPayDisplay: null,
        calculatedAmountToSend: null,
      },
      paymentError: null,
      paymentSuccessMessage: null,
      isProcessingPayment: false,

      showDeleteLoanModal: false,
      loanToDelete: null,
      isDeletingLoan: false,
      deleteLoanError: null,

      showPayPenaltyModal: false,
      penaltyToPayDetails: null,
      isPayingPenalty: false,
      payPenaltyError: null,
      payPenaltySuccessMessage: null,

      depositStore: useDepositStore(),
      showEarlyWithdrawalModal: false,
      selectedDepositForWithdrawal: null,
      calculatedEarlyWithdrawal: { initialInterest: 0, penaltyAmount: 0, interestToPay: 0, totalPayout: 0 },
      earlyWithdrawalError: null,
      earlyWithdrawalSuccessMessage: null,
      isProcessingEarlyWithdrawal: false,

      showWithdrawMaturedModal: false,
      selectedDepositForMaturedWithdrawal: null,
      maturedWithdrawalError: null,
      maturedWithdrawalSuccessMessage: null,
      isProcessingMaturedWithdrawal: false,
    };
  },

  computed: {
    userDepositsFromStore() {
      return this.depositStore.userDeposits;
    }
  },

  async created() {
    await this.fetchUserData();
    if (this.user) {
      if (!this.renewalSuccessMessage) {
        await this.fetchCardData();
      }
      await this.fetchUserLoans();
      await this.depositStore.fetchUserDeposits();
    }
    await this.fetchSupportedCurrenciesNBU();
  },
  methods: {

    openWithdrawMaturedModal(deposit) {
      this.selectedDepositForMaturedWithdrawal = {...deposit};
      this.maturedWithdrawalError = null;
      this.depositStore.error = null;
      this.maturedWithdrawalSuccessMessage = null;
      this.depositStore.withdrawalMessage = null;
      this.showWithdrawMaturedModal = true;
    },
    closeWithdrawMaturedModal() {
      this.showWithdrawMaturedModal = false;
      this.selectedDepositForMaturedWithdrawal = null;
      this.maturedWithdrawalError = null;
      this.maturedWithdrawalSuccessMessage = null;
      this.depositStore.error = null;
      this.depositStore.withdrawalMessage = null;
    },
    async handleWithdrawMatured() {
      if (!this.selectedDepositForMaturedWithdrawal) return;
      this.depositStore.error = null;
      this.depositStore.withdrawalMessage = null;

      if (!this.activeCard || this.activeCard.status !== 'active') {
        let cardStatusError = "Виведення неможливе: ваша основна картка не активна.";
        if (this.activeCard) {
          if (this.activeCard.status === 'expired') cardStatusError = "Виведення неможливе: термін дії вашої картки закінчився.";
          else if (this.activeCard.status === 'blocked') cardStatusError = "Виведення неможливе: ваша картка заблокована.";
          else cardStatusError = `Виведення неможливе: статус вашої картки "${this.activeCard.status}".`;
        }
        this.maturedWithdrawalError = cardStatusError;
        return;
      }

      this.isProcessingMaturedWithdrawal = true;
      this.maturedWithdrawalError = null;

      const result = await this.depositStore.withdrawMaturedDeposit(this.selectedDepositForMaturedWithdrawal.id);

      if (result.success) {
        this.maturedWithdrawalSuccessMessage = result.data.message || "Кошти по депозиту успішно отримані.";
        await this.fetchCardData();
        setTimeout(() => {
          this.closeWithdrawMaturedModal();
        }, 500);
      } else {
        this.maturedWithdrawalError = result.error;
      }
      this.isProcessingMaturedWithdrawal = false;
    },

    isDepositMatured(deposit) {
      return deposit && deposit.status === 'active' && deposit.maturity_date && new Date() >= new Date(deposit.maturity_date);
    },

    getDepositStatusText(status) {
      const statuses = {
        waiting_approval: "Очікує схвалення",
        active: "Активний",
        rejected: "Відхилено",
        matured: "Термін завершено",
        closed_early: "Розірвано достроково",
        closed_by_term: "Завершено"
      };
      return statuses[status] || status;
    },

    calculateDepositEndDate(approvedAt, termInMonths) {
      if (!approvedAt || !termInMonths) return 'N/A';
      const date = new Date(approvedAt);
      date.setMonth(date.getMonth() + termInMonths);
      return date.toLocaleDateString('uk-UA');
    },

    calculateSimpleInterestForUI(principal, annualRate, startDate, endDate) {
      if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) {
        return 0;
      }
      const days = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) return 0;

      const interest = principal * (annualRate / 100 / 365) * days;
      return parseFloat(interest.toFixed(2));
    },

    openEarlyWithdrawalModal(deposit) {
      this.selectedDepositForWithdrawal = {...deposit};
      this.earlyWithdrawalError = null;
      this.earlyWithdrawalSuccessMessage = null;

      if (deposit.status === 'active' && deposit.approved_at) {
        const initialInterest = this.calculateSimpleInterestForUI(
            deposit.amount,
            deposit.interest_rate,
            new Date(deposit.approved_at),
            new Date()
        );
        const penaltyPercent = deposit.early_withdrawal_penalty_percent || 50;
        const penaltyAmount = parseFloat((initialInterest * (penaltyPercent / 100)).toFixed(2));
        const interestToPay = parseFloat((initialInterest - penaltyAmount).toFixed(2));
        const totalPayout = parseFloat((deposit.amount + interestToPay).toFixed(2));

        this.calculatedEarlyWithdrawal = {
          initialInterest,
          penaltyAmount,
          interestToPay,
          totalPayout
        };
      } else {
        this.calculatedEarlyWithdrawal = { initialInterest:0, penaltyAmount:0, interestToPay:0, totalPayout: deposit.amount};
      }
      this.showEarlyWithdrawalModal = true;
    },

    closeEarlyWithdrawalModal() {
      this.showEarlyWithdrawalModal = false;
      this.selectedDepositForWithdrawal = null;
    },

    async handleEarlyWithdrawal() {
      if (!this.selectedDepositForWithdrawal) return;

      if (!this.activeCard || this.activeCard.status !== 'active') {
        let cardStatusError = "Виведення неможливе: ваша основна картка не активна.";
        if (this.activeCard) {
          if (this.activeCard.status === 'expired') cardStatusError = "Виведення неможливе: термін дії вашої картки закінчився.";
          else if (this.activeCard.status === 'blocked') cardStatusError = "Виведення неможливе: ваша картка заблокована.";
          else cardStatusError = `Виведення неможливе: статус вашої картки "${this.activeCard.status}".`;
        }
        this.earlyWithdrawalError = cardStatusError;
        return;
      }

      this.isProcessingEarlyWithdrawal = true;
      this.earlyWithdrawalError = null;
      this.earlyWithdrawalSuccessMessage = null;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.earlyWithdrawalError = "Помилка автентифікації.";
          this.isProcessingEarlyWithdrawal = false;
          return;
        }
        const headers = { Authorization: `Bearer ${token}` };
        const depositId = this.selectedDepositForWithdrawal.id;

        const response = await api.post(`/api/deposits/${depositId}/withdraw-early`, {}, { headers });

        this.earlyWithdrawalSuccessMessage = response.data.message || "Депозит успішно розірвано, кошти зараховані.";
        await this.depositStore.fetchUserDeposits();
        await this.fetchCardData();

        setTimeout(() => {
          this.closeEarlyWithdrawalModal();
        }, 500);

      } catch (error) {
        console.error("Помилка дострокового розірвання депозиту:", error);
        this.earlyWithdrawalError = error.response?.data?.error || "Не вдалося розірвати депозит.";
      } finally {
        this.isProcessingEarlyWithdrawal = false;
      }
    },

    calculateMonthlyInterest(outstandingPrincipal, annualInterestRate) {
      if (outstandingPrincipal <= 0 || annualInterestRate < 0) {
        return 0;
      }
      const monthlyRate = (annualInterestRate / 100) / 12;
      return parseFloat((outstandingPrincipal * monthlyRate).toFixed(2));
    },

    formatDisplayedDebt(value) {
      if (value === null || typeof value === 'undefined') return 'N/A';
      if (Math.abs(value) < 0.005 || Object.is(value, -0)) {
        return (0).toFixed(2);
      }
      return value.toFixed(2);
    },

    openDeleteLoanModal(loan) {
      this.loanToDelete = loan;
      this.deleteLoanError = null;
      this.showDeleteLoanModal = true;
    },

    closeDeleteLoanModal() {
      this.showDeleteLoanModal = false;
      this.loanToDelete = null;
      this.deleteLoanError = null;
    },

    async confirmDeleteLoan() {
      if (!this.loanToDelete) return;

      this.isDeletingLoan = true;
      this.deleteLoanError = null;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.deleteLoanError = "Помилка автентифікації. Спробуйте увійти знову.";
          this.isDeletingLoan = false;
          return;
        }
        const headers = {Authorization: `Bearer ${token}`};
        const loanId = this.loanToDelete.id;

        await api.delete(`/api/loans/${loanId}`, {headers});

        await this.fetchUserLoans();
        this.closeDeleteLoanModal();

      } catch (error) {
        console.error("Помилка видалення історії кредиту:", error);
        this.deleteLoanError = error.response?.data?.error || "Не вдалося видалити історію кредиту. Спробуйте пізніше.";
      } finally {
        this.isDeletingLoan = false;
      }
    },

    async fetchUserLoans() {
      this.isLoadingLoans = true;
      this.loansError = null;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.isLoadingLoans = false;
          return;
        }
        const headers = {Authorization: `Bearer ${token}`};
        const response = await api.get('/api/loans/my', {headers});
        this.userLoans = response.data;
      } catch (error) {
        console.error("Помилка завантаження кредитів:", error);
        this.loansError = error.response?.data?.error || "Не вдалося завантажити інформацію про кредити.";
        if (error.response?.status === 401 || error.response?.status === 403) {
        }
      } finally {
        this.isLoadingLoans = false;
      }
    },
    openLoanPaymentModal(loan) {
      this.selectedLoanForPayment = {...loan};
      this.paymentError = null;
      this.paymentSuccessMessage = null;

      let amountToPay = 0;
      if (loan.status === 'active' && loan.outstanding_principal > 0) {
        const currentInterest = this.calculateMonthlyInterest(loan.outstanding_principal, loan.interest_rate);
        const finalAmountDue = parseFloat((loan.outstanding_principal + currentInterest).toFixed(2));

        if (loan.monthly_payment_amount && loan.monthly_payment_amount > finalAmountDue && finalAmountDue > 0) {

          amountToPay = finalAmountDue;
        } else if (loan.monthly_payment_amount > 0) {

          amountToPay = parseFloat(loan.monthly_payment_amount.toFixed(2));
        } else {
          amountToPay = finalAmountDue;
        }
        if (amountToPay > finalAmountDue && finalAmountDue > 0) {
          amountToPay = finalAmountDue;
        }
      }
      this.paymentData.amountToPayDisplay = amountToPay > 0 ? amountToPay : null;
      this.paymentData.calculatedAmountToSend = amountToPay > 0 ? amountToPay : null;
      this.showLoanPaymentModal = true;
    },
    closeLoanPaymentModal() {
      this.showLoanPaymentModal = false;
      this.selectedLoanForPayment = null;
      this.paymentData.amountToPayDisplay = null;
      this.paymentData.calculatedAmountToSend = null;
    },
    async handleLoanPayment() {

      if (!this.activeCard || this.activeCard.status !== 'active') {
        let cardStatusError = "Платіж неможливий: ваша основна картка не активна.";
        if (this.activeCard) {
          if (this.activeCard.status === 'expired') cardStatusError = "Платіж неможливий: термін дії вашої картки закінчився.";
          else if (this.activeCard.status === 'blocked') cardStatusError = "Платіж неможливий: ваша картка заблокована.";
          else cardStatusError = `Платіж неможливий: статус вашої картки "${this.activeCard.status}".`;
        }
        this.paymentError = cardStatusError;
        return;
      }

      if (!this.selectedLoanForPayment || !this.paymentData.calculatedAmountToSend || this.paymentData.calculatedAmountToSend <= 0) {
        this.paymentError = "Сума для платежу не розрахована або некоректна.";
        return;
      }
      if (this.activeCard && this.activeCard.balance < this.paymentData.calculatedAmountToSend) {
        this.paymentError = `Недостатньо коштів на балансі картки. Потрібно: ${this.paymentData.calculatedAmountToSend.toFixed(2)} UAH`;
        return;
      }

      this.isProcessingPayment = true;
      this.paymentError = null;
      this.paymentSuccessMessage = null;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.paymentError = "Помилка автентифікації. Спробуйте увійти знову.";
          this.isProcessingPayment = false;
          return;
        }
        const headers = {Authorization: `Bearer ${token}`};
        const payload = {paymentAmount: this.paymentData.calculatedAmountToSend};
        const loanId = this.selectedLoanForPayment.id;

        const response = await api.post(`/api/loans/${loanId}/pay`, payload, {headers});

        this.paymentSuccessMessage = response.data.message || "Платіж успішно здійснено!";
        await this.fetchUserLoans();
        await this.fetchCardData();

        setTimeout(() => {
          this.closeLoanPaymentModal();
        }, 500);

      } catch (error) {
        console.error("Помилка здійснення платежу по кредиту:", error);
        this.paymentError = error.response?.data?.error || "Не вдалося здійснити платіж.";
      } finally {
        this.isProcessingPayment = false;
      }
    },
    getLoanStatusText(status) {
      const statuses = {
        waiting: "На розгляді",
        active: "Активний",
        rejected: "Відхилено",
        closed: "Погашено",
        unpaid: "Є заборгованість"
      };
      return statuses[status] || status.charAt(0).toUpperCase() + status.slice(1);
    },
    async fetchUserData() {
      this.isLoadingUser = true;
      this.user = null;
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.$router.push('/');
          return;
        }
        const headers = {Authorization: `Bearer ${token}`};
        const response = await api.get('/api/profile', {headers});
        this.user = response.data;
      } catch (error) {
        console.error("Помилка завантаження даних користувача:", error);
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          localStorage.removeItem('token');
          this.$router.push('/');
        }
      } finally {
        this.isLoadingUser = false;
      }
    },
    async fetchCardData() {
      this.isLoadingCard = true;
      try {
        const token = localStorage.getItem('token');
        if (!token || !this.user) {
          this.isLoadingCard = false;
          this.activeCard = null;
          return;
        }
        const headers = {Authorization: `Bearer ${token}`};
        const response = await api.get('/api/cards/mycard', {headers});
        if (response.data && response.data.id) {
          this.activeCard = response.data;
        } else {
          this.activeCard = null;
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.activeCard = null;
        } else {
          console.error("Помилка завантаження даних картки:", error.message);
        }
      } finally {
        this.isLoadingCard = false;
      }
    },
    openTransferModal() {
      const uiStore = useUiStore();

      if (!this.activeCard) {
        uiStore.addNotification({
          message: "Для здійснення переказу потрібна картка.",
          type: 'error'
        });
        return;
      }
      if (this.activeCard.status !== 'active') {
        uiStore.addNotification({
          message: `Перекази неможливі. Статус вашої картки: "${this.activeCard.status}".`,
          type: 'error'
        });
        return;
      }
      this.transferData = {receiverCardNumber: '', amount: null, senderCVV: '', senderPIN: ''};
      this.transferError = null;
      this.transferSuccessMessage = null;
      this.showTransferModal = true;
    },
    closeTransferModal() {
      this.showTransferModal = false;
    },
    formatReceiverCardNumber(event) {
      const input = event.target;
      let value = input.value.replace(/\D/g, '');
      if (value.length > 16) value = value.substring(0, 16);
      let formattedValue = '';
      for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formattedValue += ' ';
        formattedValue += value[i];
      }
      this.transferData.receiverCardNumber = formattedValue;
      this.$nextTick(() => {
        let newCursorPosition = input.selectionStart;
        const originalValue = input.value;
        const originalCharsBeforeCursor = originalValue.substring(0, input.selectionStart).replace(/\s/g, "").length;
        let tempRawCharCount = 0;
        let finalPos = 0;

        for (let i = 0; i < formattedValue.length; i++) {
          if (/\d/.test(formattedValue[i])) {
            tempRawCharCount++;
          }
          finalPos++;
          if (tempRawCharCount >= originalCharsBeforeCursor && originalCharsBeforeCursor > 0) {
            if (formattedValue[i] === ' ' && originalValue[finalPos - 2] !== ' ') {
            }
            break;
          }
          if (originalCharsBeforeCursor === 0 && i >= input.selectionStart) break;
        }

        if (originalValue.length > formattedValue.length && originalValue.charAt(input.selectionStart - 1) === ' ') {
          newCursorPosition = input.selectionStart - 1;
        } else {
          newCursorPosition = finalPos;
        }

        newCursorPosition = Math.min(newCursorPosition, formattedValue.length);
        newCursorPosition = Math.max(0, newCursorPosition);
        try {
          input.setSelectionRange(newCursorPosition, newCursorPosition);
        } catch (e) {
        }
      });
    },
    async handleTransferSubmit() {
      this.transferLoading = true;
      this.transferError = null;
      this.transferSuccessMessage = null;
      if (!this.activeCard || this.activeCard.status !== 'active') {
        this.transferError = "Переказ неможливий: картка не активна.";
        this.transferLoading = false;
        return;
      }
      const receiverCardNumberClean = this.transferData.receiverCardNumber.replace(/\s/g, '');
      if (!receiverCardNumberClean || !this.transferData.amount || !this.transferData.senderCVV || !this.transferData.senderPIN) {
        this.transferError = "Будь ласка, заповніть всі поля.";
        this.transferLoading = false;
        return;
      }
      if (receiverCardNumberClean.length !== 16) {
        this.transferError = "Номер картки отримувача повинен містити 16 цифр.";
        this.transferLoading = false;
        return;
      }
      if (this.transferData.amount <= 0) {
        this.transferError = "Сума переказу повинна бути більшою за нуль.";
        this.transferLoading = false;
        return;
      }
      if (this.activeCard.balance < this.transferData.amount) {
        this.transferError = "Недостатньо коштів на вашому балансі.";
        this.transferLoading = false;
        return;
      }
      if (this.transferData.senderCVV.length !== 3) {
        this.transferError = "CVV повинен містити 3 цифри.";
        this.transferLoading = false;
        return;
      }
      if (this.transferData.senderPIN.length !== 4) {
        this.transferError = "PIN-код повинен містити 4 цифри.";
        this.transferLoading = false;
        return;
      }
      if (receiverCardNumberClean === this.activeCard.card_number.replace(/\s/g, '')) {
        this.transferError = "Неможливо переказати кошти на власну картку.";
        this.transferLoading = false;
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.transferError = "Помилка автентифікації.";
          this.transferLoading = false;
          return;
        }
        const headers = {Authorization: `Bearer ${token}`};
        const payload = {
          receiverCardNumber: receiverCardNumberClean,
          amount: this.transferData.amount,
          senderCVV: this.transferData.senderCVV,
          senderPIN: this.transferData.senderPIN
        };
        const response = await api.post('/api/transactions/transfer', payload, {headers});
        this.transferSuccessMessage = response.data.message || "Переказ успішно виконано!";
        await this.fetchCardData();
        setTimeout(() => {
          this.closeTransferModal();
          this.transferSuccessMessage = null;
        }, 500);
      } catch (error) {
        this.transferError = error.response?.data?.error || "Помилка під час переказу.";
      } finally {
        this.transferLoading = false;
      }
    },
    openRenewCardModal() {
      this.renewalData = {newPin: ''};
      this.renewalError = null;
      this.renewalSuccessMessage = null;
      this.showRenewCardModal = true;
    },
    closeRenewCardModal() {
      this.showRenewCardModal = false;
    },
    async handleRenewCardSubmit() {
      this.renewalLoading = true;
      this.renewalError = null;
      this.renewalSuccessMessage = null;
      if (!this.renewalData.newPin || this.renewalData.newPin.length !== 4 || isNaN(this.renewalData.newPin)) {
        this.renewalError = "Будь ласка, введіть коректний 4-значний PIN.";
        this.renewalLoading = false;
        return;
      }
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.renewalError = "Помилка автентифікації.";
          this.renewalLoading = false;
          return;
        }
        const headers = {Authorization: `Bearer ${token}`};
        const payload = {newPin: this.renewalData.newPin};
        const response = await api.post('/api/cards/renew', payload, {headers});
        this.renewalSuccessMessage = response.data.message || "Запит на поновлення картки прийнято!";
        if (response.data.updatedCardPreview) {
          this.activeCard = {
            ...this.activeCard,
            status: response.data.updatedCardPreview.status,
            card_number: response.data.updatedCardPreview.cardNumber,
            dueDate: response.data.updatedCardPreview.dueDate,
          };
        } else {
          await this.fetchCardData();
        }
        setTimeout(() => {
          this.closeRenewCardModal();
        }, 2500);
      } catch (error) {
        this.renewalError = error.response?.data?.error || "Помилка під час запиту на поновлення картки.";
      } finally {
        this.renewalLoading = false;
      }
    },
    async fetchSupportedCurrenciesNBU() {
      this.isLoadingCurrencies = true;
      this.currencyApiError = null;
      this.allRates = {};
      try {
        const response = await axios.get('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach(currency => {
            this.allRates[currency.cc] = currency.rate;
          });
          this.allRates['UAH'] = 1.0;
          this.supportedCurrencies = Object.keys(this.allRates).sort();
          if (response.data.length > 0) {
            this.nbuExchangeDate = response.data[0].exchangedate;
          }

          if (!this.supportedCurrencies.includes(this.conversionRequest.from)) {
            this.conversionRequest.from = this.supportedCurrencies.includes('UAH') ? 'UAH' : (this.supportedCurrencies[0] || '');
          }
          if (!this.supportedCurrencies.includes(this.conversionRequest.to)) {
            let defaultTarget = this.supportedCurrencies.includes('USD') ? 'USD' : '';
            if (!defaultTarget || defaultTarget === this.conversionRequest.from) {
              defaultTarget = this.supportedCurrencies.find(c => c !== this.conversionRequest.from) || (this.supportedCurrencies[0] || '');
            }
            this.conversionRequest.to = defaultTarget;
          }
          if (this.conversionRequest.from === this.conversionRequest.to && this.supportedCurrencies.length > 1) {
            this.conversionRequest.to = this.supportedCurrencies.find(c => c !== this.conversionRequest.from) || this.supportedCurrencies[1] || this.supportedCurrencies[0];
          }
        } else {
          new Error("Некоректний формат відповіді від API курсів валют.");
        }
      } catch (error) {
        console.error("Помилка завантаження списку валют НБУ:", error);
        this.currencyApiError = "Не вдалося завантажити курси валют. Спробуйте пізніше.";
        this.supportedCurrencies = ['UAH', 'USD', 'EUR', 'PLN'];
        this.allRates = {'UAH': 1.0, 'USD': 40.0, 'EUR': 43.0, 'PLN': 10.0};
        this.nbuExchangeDate = new Date().toLocaleDateString('uk-UA');
      } finally {
        this.isLoadingCurrencies = false;
      }
    },
    async handleCurrencyConversion() {
      const {amount, from, to} = this.conversionRequest;
      if (!amount || !from || !to) {
        this.conversionResult = {
          ...this.conversionResult,
          error: "Будь ласка, заповніть всі поля.",
          convertedAmount: null,
          originalAmount: amount
        };
        return;
      }
      if (amount <= 0) {
        this.conversionResult = {
          ...this.conversionResult,
          error: "Сума повинна бути більшою за нуль.",
          convertedAmount: null,
          originalAmount: amount
        };
        return;
      }
      if (from === to) {
        this.conversionResult = {
          ...this.conversionResult,
          error: "Валюти мають бути різними.",
          convertedAmount: null,
          originalAmount: amount
        };
        return;
      }
      this.isLoadingConversion = true;
      this.conversionResult = {
        originalAmount: amount,
        convertedAmount: null,
        rate: null,
        date: this.nbuExchangeDate,
        error: null
      };
      try {
        const rateFrom = this.allRates[from];
        const rateTo = this.allRates[to];
        if (typeof rateFrom === 'undefined' || typeof rateTo === 'undefined') {
          new Error("Обрані валюти не підтримуються або курси для них не знайдено.");
        }
        let amountInUAH = (from === 'UAH') ? parseFloat(amount) : parseFloat(amount) * rateFrom;
        let finalConvertedAmount = (to === 'UAH') ? amountInUAH : amountInUAH / rateTo;
        this.conversionResult.convertedAmount = finalConvertedAmount;
        if (amount !== 0) {
          this.conversionResult.rate = finalConvertedAmount / amount;
        }
      } catch (error) {
        console.error("Помилка конвертації валюти (НБУ):", error);
        this.conversionResult.error = error.message || "Помилка під час конвертації.";
      } finally {
        this.isLoadingConversion = false;
      }

    },

    openPayPenaltyModal(loan) {
      this.penaltyToPayDetails = {...loan};
      this.payPenaltyError = null;
      this.payPenaltySuccessMessage = null;
      this.showPayPenaltyModal = true;
    },
    closePayPenaltyModal() {
      this.showPayPenaltyModal = false;
      this.penaltyToPayDetails = null;
    },
    async handlePayPenalty() {

      if (!this.activeCard || this.activeCard.status !== 'active') {
        let cardStatusError = "Сплата штрафу неможлива: ваша основна картка не активна.";
        if (this.activeCard) {
          if (this.activeCard.status === 'expired') cardStatusError = "Сплата штрафу неможлива: термін дії вашої картки закінчився.";
          else if (this.activeCard.status === 'blocked') cardStatusError = "Сплата штрафу неможлива: ваша картка заблокована.";
          else cardStatusError = `Сплата штрафу неможлива: статус вашої картки "${this.activeCard.status}".`;
        }
        this.payPenaltyError = cardStatusError;
        return;
      }

      if (!this.penaltyToPayDetails || !this.penaltyToPayDetails.accrued_penalty || this.penaltyToPayDetails.accrued_penalty <= 0) {
        this.payPenaltyError = "Сума штрафу для сплати не визначена або нульова.";
        return;
      }
      if (this.activeCard && this.activeCard.balance < this.penaltyToPayDetails.accrued_penalty) {
        this.payPenaltyError = `Недостатньо коштів на балансі картки. Потрібно: ${this.penaltyToPayDetails.accrued_penalty.toFixed(2)} UAH`;
        return;
      }

      this.isPayingPenalty = true;
      this.payPenaltyError = null;
      this.payPenaltySuccessMessage = null;

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.payPenaltyError = "Помилка автентифікації.";
          this.isPayingPenalty = false;
          return;
        }
        const headers = {Authorization: `Bearer ${token}`};
        const loanId = this.penaltyToPayDetails.id;

        const response = await api.post(`/api/loans/${loanId}/pay-penalty`, {}, {headers});

        this.payPenaltySuccessMessage = response.data.message || "Штраф успішно сплачено!";
        await this.fetchUserLoans();
        await this.fetchCardData();

        setTimeout(() => {
          this.closePayPenaltyModal();
        }, 2500);

      } catch (error) {
        console.error("Помилка сплати штрафу по кредиту:", error);
        this.payPenaltyError = error.response?.data?.error || "Не вдалося сплатити штраф.";
      } finally {
        this.isPayingPenalty = false;
      }

    }
  }
};
</script>

<style scoped>

.page {
  text-align: center;
  padding: 20px 15px;
  max-width: 800px;
  margin: 0 auto;
}
h1 {
  font-size: 28px;
  margin-bottom: 20px;
  color: #ffffff;
}
h2 {
  font-size: 22px;
  margin-top: 30px;
  margin-bottom: 15px;
  color: #e0e0e0;
}
.user-info p {
  font-size: 16px;
  color: #cfd8dc;
  margin-bottom: 10px;
  line-height: 1.6;
}
.user-info strong {
  color: #b0bec5;
}
.card-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}
.action-button {
  background-color: #42b983;
  color: #ffffff;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-top: 0;
  min-width: 200px;
}
.action-button.transfer-button {
  margin-top: 20px;
}

.action-button.renew-button {
  background-color: #f0ad4e;
}
.action-button.renew-button:hover {
  background-color: #ec971f;
}
.action-button:hover {
  background-color: #369966;
}
.action-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}
.status-message {
  margin-top: 10px;
  padding: 10px;
  border-radius: 5px;
  font-weight: bold;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}
.status-message.pending {
  background-color: rgba(240, 173, 78, 0.2);
  color: #f0ad4e;
  border: 1px solid #f0ad4e;
}
.status-message.error {
  background-color: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
  border: 1px solid #ff6b6b;
}

.modal-overlay {
  position: fixed; top: 0; left: 0; height: 100%; width: 100%;
  background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center;
  align-items: center; z-index: 1050; padding: 15px;
}
.modal-content {
  background-color: #1e1e1e; color: #ffffff; width: 100%; max-width: 400px;
  padding: 25px 30px; border-radius: 8px; box-shadow: 0 8px 25px rgba(0,0,0,0.6);
  position: relative; text-align: left;
}
.modal-content h3 { color: #42b983; max-width: 400px; margin-bottom: 20px; text-align: center; font-size: 20px;}
.close-icon {
  position: absolute; top: 10px; right: 15px; font-size: 28px; color: #aaa;
  cursor: pointer; transition: color 0.3s ease; line-height: 1;
}
.close-icon:hover { color: #fff; }
.transfer-from-info {
  margin-bottom: 20px; padding: 10px; background-color: #2a2a2a;
  border-radius: 5px; font-size: 14px;
}
.transfer-from-info p { margin: 5px 0; color: #ccc;}
.form-group {
  margin-bottom: 18px;
  text-align: left;
}
.form-group label {
  display: block; margin-bottom: 8px; color: #cfd8dc;
  font-size: 14px; font-weight: 500;
}
.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="password"],
.form-group select {
  width: 100%; padding: 12px 15px; border: 1px solid #444;
  border-radius: 5px; background-color: #333; color: #fff;
  box-sizing: border-box; font-size: 16px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.form-group input[type="text"]:focus,
.form-group input[type="number"]:focus,
.form-group input[type="password"]:focus,
.form-group select:focus {
  border-color: #42b983; box-shadow: 0 0 0 2px rgba(66,185,131,0.3); outline: none;
}
.form-group input::placeholder { color: #777; }

.submit-button {
  background-color: #42b983; padding: 12px 20px; color: #fff; border: none;
  border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold;
  transition: background-color 0.3s ease; width: 100%;
}
.submit-button:hover { background-color: #369966; }
.submit-button:disabled { background-color: #555; cursor: not-allowed; }

.error-message {
  color: #ff6b6b; background-color: rgba(255,107,107,0.1);
  border: 1px solid rgba(255,107,107,0.3); padding: 10px;
  border-radius: 5px; margin-bottom: 15px; font-size: 14px; text-align: center;
}
.success-message {
  color: #42b983; background-color: rgba(66,185,131,0.1);
  border: 1px solid rgba(66,185,131,0.3); padding: 10px;
  border-radius: 5px; margin-bottom: 15px; font-size: 14px; text-align: center;
}

.user-deposits-section {
  margin-top: 40px;
  padding: 20px;
  background-color: #252525;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
.user-deposits-section h2 {
  color: #42b983;
  text-align: center;
  margin-bottom: 20px;
}
.deposits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}
.deposit-item {
  background-color: rgb(55, 55, 55, 0.7);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 15px 20px;
  text-align: left;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
.deposit-item h3 {
  color: #e0e0e0;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.15em;
  border-bottom: 1px solid #4a4a4a;
  padding-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.deposit-status-active .status-badge { background-color: #28a745; color: white; }
.deposit-status-waiting_approval .status-badge { background-color: #f0ad4e; color: #212529; }
.deposit-status-closed_early .status-badge, .deposit-status-closed_by_term .status-badge { background-color: #5bc0de; color: white; }
.deposit-status-rejected .status-badge { background-color: #d9534f; color: white; }

.deposit-details p {
  margin: 7px 0;
  font-size: 0.9em;
  color: #c5c5c5;
}
.deposit-details p strong { color: #e8e8e8; margin-right: 5px;}

.withdraw-early-button {
  margin-top: 15px;
  background-color: #ffc107;
  color: #212529;
  padding: 8px 15px;
  font-size: 0.95em;
  align-self: flex-start;
}
.withdraw-early-button:hover {
  background-color: #e0a800;
}
.deposit-withdrawal-details {
  border-bottom: 1px solid #333;
  padding-bottom: 15px;
  margin-bottom: 20px;
}
.text-warning {
  color: #f0ad4e !important;
  font-size: 0.85em;
}
.d-block { display: block !important; }
.mt-2 { margin-top: 0.5rem !important; }

.currency-converter-section.compact {
  max-width: 550px;
  margin-left: auto;
  margin-right: auto;
  margin-top: 30px;
  padding: 20px;
  background-color: rgb(55, 55, 55, 0.5);
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}

.currency-converter-section.compact h2 {
  margin-bottom: 20px;
  font-size: 20px;
}

.converter-form.compact {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.converter-form.compact .form-row.compact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
}

.converter-form.compact .form-group.compact-group {
  margin-bottom: 0;
  flex-grow: 1;
  flex-shrink: 1;
}
.converter-form.compact .form-group.compact-group.amount-group {
  flex-basis: calc(50% - 5px);
  min-width: 120px;
}
.converter-form.compact .form-group.compact-group.currency-group {
  flex-basis: calc(50% - 5px);
  min-width: 100px;
}
.converter-form.compact .form-group.compact-group.button-group {
  flex-basis: 100%;
  margin-top: 10px;
}


.converter-form.compact label {
  font-size: 13px;
  margin-bottom: 5px;
}

.converter-form.compact input[type="number"],
.converter-form.compact select {
  padding: 8px 10px;
  font-size: 15px;
  height: 38px;
}

.converter-form.compact .convert-button.compact-button {
  padding: 8px 10px;
  font-size: 15px;
  height: 38px;
  line-height: normal;
  width: 100%;
}

.conversion-result.compact-result {
  margin-top: 15px;
  padding: 8px 10px;
}
.conversion-result.compact-result p {
  font-size: 0.95em;
  margin: 4px 0;
}
.conversion-result.compact-result strong {
  font-size: 1.05em;
}
.conversion-result.compact-result .rate-info.compact-rate {
  font-size: 0.75em;
}

.loading-message.compact-loading,
.error-message.compact-error {
  padding: 8px;
  font-size: 0.9em;
  margin-top: 10px;
}
.conversion-error-display.compact-error {
  margin-top: 10px;
}

@media (max-width: 768px) {
  .page {
    max-width: 100%;
    padding: 15px 10px;
  }
  h1 {
    font-size: 24px;
  }
  h2 {
    font-size: 20px;
  }
  .user-info p, .deposit-details p, .loan-details p {
    font-size: 14px;
  }
  .loans-grid, .deposits-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .loan-item, .deposit-item {
    padding: 12px 15px;
  }
  .action-button, .submit-button {
    font-size: 14px;
    padding: 10px 15px;
    min-width: 150px;
  }
  .card-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .card-actions .action-button {
    width: 100%;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
  }
  .modal-content {
    max-width: 400px;
    padding: 20px;
  }
  .modal-content h3 {
    max-width: 400px;
    font-size: 18px;
  }
  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group input[type="password"],
  .form-group select {
    font-size: 15px;
    padding: 10px 12px;
  }
  .currency-converter-section.compact .form-row.compact-row {
    flex-direction: column;
    align-items: stretch;
  }
  .currency-converter-section.compact .form-group.compact-group {
    flex-basis: auto;
    width: 100%;
  }
  .currency-converter-section.compact .form-group.compact-group.button-group {
    margin-top: 10px;
  }
}

@media (max-width: 480px) {
  .converter-form.compact .form-row.compact-row {
    flex-direction: column;
    align-items: stretch;
  }
  .converter-form.compact .form-group.compact-group {
    flex-basis: auto;
    width: 100%;
  }
  .converter-form.compact .form-group.compact-group.button-group {
    margin-top: 15px;
  }
  .converter-form.compact .convert-button.compact-button {
    width: 100%;
  }
  .modal-content {
    max-width: 280px;
    padding: 20px;
  }
  .modal-content h3 {
    max-width: 280px;
    font-size: 18px;
  }
}

.user-loans-section {
  margin-top: 40px;
  padding: 20px;
  background-color: #252525;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
.user-loans-section h2 {
  color: #42b983;
  text-align: center;
  margin-bottom: 20px;
}
.loans-grid .deposits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.loan-item {
  background-color: rgb(55, 55, 55, 0.7);
  border: 1px solid #444;
  border-radius: 8px;
  padding: 15px 20px;
  text-align: left;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
.loan-item h3 {
  color: #e0e0e0;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.15em;
  border-bottom: 1px solid #4a4a4a;
  padding-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.status-badge {
  font-weight: normal;
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid transparent;
}

.loan-status-active .status-badge { background-color: #28a745; color: white; border-color: #1e7e34; }
.loan-status-waiting .status-badge { background-color: #f0ad4e; color: #212529; border-color: #d58512; }
.loan-status-closed .status-badge { background-color: #5bc0de; color: white; border-color: #31b0d5;}
.loan-status-rejected .status-badge { background-color: #d9534f; color: white; border-color: #b52b27;}
.loan-status-unpaid .status-badge { background-color: #c9302c; color: white; border-color: #ac2925;}


.loan-details p {
  margin: 7px 0;
  font-size: 0.9em;
  color: #c5c5c5;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}
.loan-details p strong {
  color: #e8e8e8;
  margin-right: 10px;
  flex-shrink: 0;
}
.pay-loan-button {
  margin-top: 15px;
  background-color: #007bff;
  padding: 8px 15px;
  font-size: 0.95em;
  align-self: flex-start;
}
.pay-loan-button:hover {
  background-color: #0056b3;
}
.loan-payments-history {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed #555;
  font-size: 0.85em;
}
.loan-payments-history h4 {
  margin-bottom: 8px;
  color: #b0bec5;
  font-size: 0.95em;
}
.loan-payments-history ul {
  list-style: none;
  padding-left: 0;
  color: #999;
}
.loan-payments-history li {
  padding: 4px 0;
  border-bottom: 1px dotted #444;
  line-height: 1.4;
}
.loan-payments-history li:last-child {
  border-bottom: none;
}
.info-text {
  font-style: italic;
  color: #aaa;
  margin-top: 10px;
  font-size: 0.9em;
}
.info-text.success { color: #28a745; font-weight: bold; }
.info-text.error { color: #d9534f; font-weight: bold; }

.loan-payment-details {
  border-bottom: 1px solid #333;
  padding-bottom: 15px;
}

.delete-loan-history-button {
  background-color: #c9302c;
  color: white;
  padding: 6px 12px;
  font-size: 0.85em;
  margin-top: 10px;
  align-self: flex-start;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.delete-loan-history-button:hover {
  background-color: #a52825;
}
.delete-loan-history-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

.loan-actions-closed {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.delete-confirmation-modal .modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}
.delete-confirmation-modal .submit-button {
  width: auto;
  padding: 10px 20px;
  margin-top: 0;
}
.delete-confirmation-modal .delete-confirm-btn {
  background-color: #d9534f;
}
.delete-confirmation-modal .delete-confirm-btn:hover {
  background-color: #c9302c;
}
.delete-confirmation-modal .cancel-btn {
  background-color: #555;
}
.delete-confirmation-modal .cancel-btn:hover {
  background-color: #444;
}

.loan-details p span:last-child {
  word-break: break-word;
  text-align: right;
  flex-grow: 1;
}

.loan-actions-closed-rejected {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.modal-content .loan-payment-details {
  border-bottom: 1px solid #333;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.pay-penalty-button {
  margin-top: 10px;
  background-color: #dc3545;
  color: white;
}
.pay-penalty-button:hover {
  background-color: #c82333;
}

.pay-penalty-submit-btn {
  background-color: #28a745;
}
.pay-penalty-submit-btn:hover {
  background-color: #218838;
}

.deposit-status-matured-display {
  background-color: #007bff !important;
  color: white !important;
}
.get-funds-button {
  background-color: #007bff;
}
.get-funds-button:hover {
  background-color: #0056b3;
}
</style>