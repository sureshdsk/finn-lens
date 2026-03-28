import type {
  UserProfile,
} from './auth'
import type {
  BankAccount, Transaction, MonthlySummary, UploadResult,
} from './banking'
import type {
  CreditCard, CreditCardBill, CreditCardTransaction, CCTransactionList, MaterializeResult,
} from './creditCards'
import type {
  UnifiedTransaction, UnifiedTransactionList, UnifiedTransactionDetail,
  MonthlySpending, SpendingSummary,
} from './unified'
import type {
  Subscription, SubscriptionList, DetectResult,
} from './subscriptions'
import type {
  GmailStatus, SyncJob, SyncTriggerResponse, EmailMessageItem, EmailMessageList,
  SenderRule, ExtractedData, InvestmentSummary, MFHolding, UpcomingSIP, PipelineStep,
} from './gmail'
import type {
  ClassifyResult, Category,
} from './classifier'

const NOW = Date.now()
const HOUR = 3_600_000

// ─── IN-MEMORY STATE ──────────────────────────────────────────

let demoProfile: UserProfile = {
  id: 1,
  username: 'demo',
  email: 'ammu@finnlens.com',
  is_staff: false,
  display_name: 'Ammu Kutty',
  date_of_birth: '2018-08-01',
  avatar_url: '',
  currency: 'INR',
}

const demoAccounts: BankAccount[] = [
  { id: 1, bank_name: 'HDFC', account_number: '1234567890', account_holder_name: 'Ammu Kutty', currency: 'INR', transaction_count: 156 },
  { id: 2, bank_name: 'SBI', account_number: '9876543210', account_holder_name: 'Ammu Kutty', currency: 'INR', transaction_count: 89 },
  { id: 3, bank_name: 'ICICI', account_number: '5566778899', account_holder_name: 'Ammu Kutty', currency: 'INR', transaction_count: 42 },
  { id: 4, bank_name: 'Kotak', account_number: '1122334455', account_holder_name: 'Ammu Kutty', currency: 'INR', transaction_count: 67 },
]

const demoCards: CreditCard[] = [
  { id: 1, issuer: 'HDFC', card_last4: '6677', card_name: 'Regalia Gold', billing_day: 15, credit_limit: '500000', currency: 'INR', transaction_count: 45, last_bill_total: '42350', last_bill_date: '2026-02-15' },
  { id: 2, issuer: 'ICICI', card_last4: '1198', card_name: 'Amazon Pay', billing_day: 22, credit_limit: '200000', currency: 'INR', transaction_count: 32, last_bill_total: '18900', last_bill_date: '2026-02-22' },
]

const demoBankTransactions: Transaction[] = [
  { id: 1, transaction_date: '2026-03-08', value_date: '2026-03-08', description: 'AMAZON.IN AMZN MKTP', cheque_number: null, debit: '3499.00', credit: null, balance: '341701.00', category: 'ecommerce', category_confidence: 0.92, merchant_name: 'Amazon India', payment_channel: 'UPI', recipient_name: '', upi_handle: 'amazon@apl', is_user_categorized: false },
  { id: 2, transaction_date: '2026-03-07', value_date: '2026-03-07', description: 'SWIGGY ORDER', cheque_number: null, debit: '856.00', credit: null, balance: '345200.00', category: 'food', category_confidence: 0.95, merchant_name: 'Swiggy', payment_channel: 'UPI', recipient_name: '', upi_handle: 'swiggy@ybl', is_user_categorized: false },
  { id: 3, transaction_date: '2026-03-01', value_date: '2026-03-01', description: 'SALARY CREDIT', cheque_number: null, debit: null, credit: '240000.00', balance: '545200.00', category: 'investment_finance', category_confidence: 0.98, merchant_name: 'Employer', payment_channel: 'NEFT', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 4, transaction_date: '2026-02-28', value_date: '2026-02-28', description: 'ELECTRICITY BILL', cheque_number: null, debit: '2340.00', credit: null, balance: '305200.00', category: 'bills_utilities', category_confidence: 0.89, merchant_name: 'Tata Power', payment_channel: 'NET', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 5, transaction_date: '2026-02-26', value_date: '2026-02-26', description: 'UBER TRIP', cheque_number: null, debit: '425.00', credit: null, balance: '307540.00', category: 'travel_transport', category_confidence: 0.94, merchant_name: 'Uber', payment_channel: 'UPI', recipient_name: '', upi_handle: 'uber@olamoney', is_user_categorized: false },
  { id: 6, transaction_date: '2026-02-25', value_date: '2026-02-25', description: 'HOUSE RENT TRANSFER', cheque_number: null, debit: '25000.00', credit: null, balance: '307965.00', category: 'investment_finance', category_confidence: 0.96, merchant_name: 'Landlord', payment_channel: 'NEFT', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 7, transaction_date: '2026-02-24', value_date: '2026-02-24', description: 'FD INTEREST', cheque_number: null, debit: null, credit: '4200.00', balance: '332965.00', category: 'investment_finance', category_confidence: 0.99, merchant_name: 'SBI', payment_channel: 'INTERNAL', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 8, transaction_date: '2026-02-22', value_date: '2026-02-22', description: 'CULT.FIT MEMBERSHIP', cheque_number: null, debit: '2500.00', credit: null, balance: '328765.00', category: 'healthcare', category_confidence: 0.91, merchant_name: 'Cult.fit', payment_channel: 'UPI', recipient_name: '', upi_handle: 'cultfit@ybl', is_user_categorized: false },
  { id: 9, transaction_date: '2026-02-20', value_date: '2026-02-20', description: 'FREELANCE PAYMENT', cheque_number: null, debit: null, credit: '35000.00', balance: '331265.00', category: 'investment_finance', category_confidence: 0.97, merchant_name: 'Client', payment_channel: 'NEFT', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 10, transaction_date: '2026-02-18', value_date: '2026-02-18', description: 'MOBILE RECHARGE', cheque_number: null, debit: '599.00', credit: null, balance: '296265.00', category: 'bills_utilities', category_confidence: 0.93, merchant_name: 'Jio', payment_channel: 'UPI', recipient_name: '', upi_handle: 'jio@paytm', is_user_categorized: false },
  { id: 11, transaction_date: '2026-02-17', value_date: '2026-02-17', description: 'BIGBASKET ORDER', cheque_number: null, debit: '3200.00', credit: null, balance: '296864.00', category: 'groceries', category_confidence: 0.94, merchant_name: 'BigBasket', payment_channel: 'UPI', recipient_name: '', upi_handle: 'bigbasket@ybl', is_user_categorized: false },
  { id: 12, transaction_date: '2026-02-14', value_date: '2026-02-14', description: 'PETROL HP', cheque_number: null, debit: '2800.00', credit: null, balance: '300064.00', category: 'travel_transport', category_confidence: 0.90, merchant_name: 'HP Petrol', payment_channel: 'CARD', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 13, transaction_date: '2026-02-10', value_date: '2026-02-10', description: 'INSURANCE PREMIUM', cheque_number: null, debit: '12000.00', credit: null, balance: '302864.00', category: 'healthcare', category_confidence: 0.95, merchant_name: 'HDFC Life', payment_channel: 'NACH', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 14, transaction_date: '2026-02-08', value_date: '2026-02-08', description: 'NEFT SAVINGS TRANSFER', cheque_number: null, debit: null, credit: '50000.00', balance: '314864.00', category: 'transfers_payments', category_confidence: 0.88, merchant_name: 'Self Transfer', payment_channel: 'NEFT', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 15, transaction_date: '2026-02-05', value_date: '2026-02-05', description: 'FLIPKART ORDER', cheque_number: null, debit: '7899.00', credit: null, balance: '264864.00', category: 'ecommerce', category_confidence: 0.93, merchant_name: 'Flipkart', payment_channel: 'UPI', recipient_name: '', upi_handle: 'flipkart@ybl', is_user_categorized: false },
  { id: 16, transaction_date: '2026-02-03', value_date: '2026-02-03', description: 'NETFLIX SUBSCRIPTION', cheque_number: null, debit: '649.00', credit: null, balance: '272763.00', category: 'entertainment', category_confidence: 0.97, merchant_name: 'Netflix', payment_channel: 'NACH', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 17, transaction_date: '2026-01-28', value_date: '2026-01-28', description: 'RESTAURANT ZOMATO', cheque_number: null, debit: '1850.00', credit: null, balance: '273412.00', category: 'food', category_confidence: 0.92, merchant_name: 'Zomato', payment_channel: 'UPI', recipient_name: '', upi_handle: 'zomato@ybl', is_user_categorized: false },
  { id: 18, transaction_date: '2026-01-25', value_date: '2026-01-25', description: 'COURSE UDEMY', cheque_number: null, debit: '1299.00', credit: null, balance: '275262.00', category: 'education', category_confidence: 0.91, merchant_name: 'Udemy', payment_channel: 'UPI', recipient_name: '', upi_handle: 'udemy@razorpay', is_user_categorized: false },
  { id: 19, transaction_date: '2026-01-20', value_date: '2026-01-20', description: 'CRED REWARD', cheque_number: null, debit: null, credit: '750.00', balance: '276561.00', category: 'services_misc', category_confidence: 0.85, merchant_name: 'CRED', payment_channel: 'NEFT', recipient_name: '', upi_handle: '', is_user_categorized: false },
  { id: 20, transaction_date: '2026-01-15', value_date: '2026-01-15', description: 'ZARA PURCHASE', cheque_number: null, debit: '5400.00', credit: null, balance: '275811.00', category: 'clothing', category_confidence: 0.94, merchant_name: 'Zara', payment_channel: 'CARD', recipient_name: '', upi_handle: '', is_user_categorized: false },
]

const demoCardTransactions: CreditCardTransaction[] = [
  { id: 101, transaction_date: '2026-03-05', transaction_time: '14:30:00', amount: '3499.00', currency: 'INR', description: 'AMAZON.IN', merchant_name: 'Amazon India', category: 'ecommerce', category_confidence: 0.92, is_user_categorized: false, source_type: 'email' },
  { id: 102, transaction_date: '2026-03-01', transaction_time: '20:15:00', amount: '1299.00', currency: 'INR', description: 'SWIGGY ORDER #4829', merchant_name: 'Swiggy', category: 'food', category_confidence: 0.95, is_user_categorized: false, source_type: 'email' },
  { id: 103, transaction_date: '2026-02-27', transaction_time: '00:00:00', amount: '649.00', currency: 'INR', description: 'NETFLIX SUBSCRIPTION', merchant_name: 'Netflix', category: 'entertainment', category_confidence: 0.97, is_user_categorized: false, source_type: 'email' },
  { id: 104, transaction_date: '2026-02-25', transaction_time: '16:20:00', amount: '7899.00', currency: 'INR', description: 'FLIPKART ORDER', merchant_name: 'Flipkart', category: 'ecommerce', category_confidence: 0.93, is_user_categorized: false, source_type: 'email' },
  { id: 105, transaction_date: '2026-02-20', transaction_time: '13:30:00', amount: '5400.00', currency: 'INR', description: 'ZARA', merchant_name: 'Zara', category: 'clothing', category_confidence: 0.94, is_user_categorized: false, source_type: 'email' },
  { id: 106, transaction_date: '2026-02-18', transaction_time: '09:30:00', amount: '599.00', currency: 'INR', description: 'JIO RECHARGE', merchant_name: 'Jio', category: 'bills_utilities', category_confidence: 0.93, is_user_categorized: false, source_type: 'email' },
  { id: 107, transaction_date: '2026-02-15', transaction_time: '11:15:00', amount: '4350.00', currency: 'INR', description: 'BIGBASKET GROCERIES', merchant_name: 'BigBasket', category: 'groceries', category_confidence: 0.94, is_user_categorized: false, source_type: 'email' },
  { id: 108, transaction_date: '2026-02-10', transaction_time: '10:00:00', amount: '12000.00', currency: 'INR', description: 'HDFC LIFE INSURANCE', merchant_name: 'HDFC Life', category: 'healthcare', category_confidence: 0.95, is_user_categorized: false, source_type: 'email' },
  { id: 109, transaction_date: '2026-02-05', transaction_time: '17:00:00', amount: '2800.00', currency: 'INR', description: 'HP PETROL PUMP', merchant_name: 'HP Petrol', category: 'travel_transport', category_confidence: 0.90, is_user_categorized: false, source_type: 'email' },
  { id: 110, transaction_date: '2026-02-01', transaction_time: '20:30:00', amount: '4200.00', currency: 'INR', description: 'BARBECUE NATION', merchant_name: 'Barbeque Nation', category: 'food', category_confidence: 0.92, is_user_categorized: false, source_type: 'email' },
  { id: 111, transaction_date: '2026-03-04', transaction_time: '10:00:00', amount: '219.00', currency: 'INR', description: 'APPLE ICLOUD+', merchant_name: 'Apple', category: 'services_misc', category_confidence: 0.96, is_user_categorized: false, source_type: 'email' },
  { id: 112, transaction_date: '2026-03-02', transaction_time: '00:00:00', amount: '1650.00', currency: 'INR', description: 'OPENAI CHATGPT PLUS', merchant_name: 'OpenAI', category: 'services_misc', category_confidence: 0.94, is_user_categorized: false, source_type: 'email' },
]

const demoCardBills: CreditCardBill[] = [
  { id: 1, statement_date: '2026-02-15', due_date: '2026-03-05', total_due: '42350.00', min_due: '4235.00', billing_period_start: '2026-01-16', billing_period_end: '2026-02-15', is_paid: false, paid_date: null, transaction_count: 22, transactions_total: '42350.00', gmail_message_id: null },
  { id: 2, statement_date: '2026-01-15', due_date: '2026-02-05', total_due: '38200.00', min_due: '3820.00', billing_period_start: '2025-12-16', billing_period_end: '2026-01-15', is_paid: true, paid_date: '2026-02-04', transaction_count: 18, transactions_total: '38200.00', gmail_message_id: null },
  { id: 3, statement_date: '2026-02-22', due_date: '2026-03-14', total_due: '18900.00', min_due: '1890.00', billing_period_start: '2026-01-23', billing_period_end: '2026-02-22', is_paid: false, paid_date: null, transaction_count: 15, transactions_total: '18900.00', gmail_message_id: null },
  { id: 4, statement_date: '2026-01-22', due_date: '2026-02-12', total_due: '12450.00', min_due: '1245.00', billing_period_start: '2025-12-23', billing_period_end: '2026-01-22', is_paid: true, paid_date: '2026-02-11', transaction_count: 12, transactions_total: '12450.00', gmail_message_id: null },
]

const demoUnifiedTransactions: UnifiedTransaction[] = [
  { id: 1, transaction_date: '2026-03-08', amount: '-3499.00', currency: 'INR', merchant_name: 'Amazon India', description: 'AMAZON.IN AMZN MKTP', category: 'ecommerce', category_confidence: 0.92, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 2, transaction_date: '2026-03-07', amount: '-856.00', currency: 'INR', merchant_name: 'Swiggy', description: 'SWIGGY ORDER', category: 'food', category_confidence: 0.95, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 3, transaction_date: '2026-03-05', amount: '-3499.00', currency: 'INR', merchant_name: 'Amazon India', description: 'AMAZON.IN', category: 'ecommerce', category_confidence: 0.92, instrument_type: 'credit_card', source_count: 1, credit_card_label: 'HDFC ••6677', bank_account_label: null },
  { id: 4, transaction_date: '2026-03-04', amount: '-219.00', currency: 'INR', merchant_name: 'Apple', description: 'APPLE ICLOUD+', category: 'services_misc', category_confidence: 0.96, instrument_type: 'credit_card', source_count: 1, credit_card_label: 'ICICI ••1198', bank_account_label: null },
  { id: 5, transaction_date: '2026-03-02', amount: '-1650.00', currency: 'INR', merchant_name: 'OpenAI', description: 'OPENAI CHATGPT PLUS', category: 'services_misc', category_confidence: 0.94, instrument_type: 'credit_card', source_count: 1, credit_card_label: 'HDFC ••6677', bank_account_label: null },
  { id: 6, transaction_date: '2026-03-01', amount: '240000.00', currency: 'INR', merchant_name: 'Employer', description: 'SALARY CREDIT', category: 'investment_finance', category_confidence: 0.98, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 7, transaction_date: '2026-02-28', amount: '-2340.00', currency: 'INR', merchant_name: 'Tata Power', description: 'ELECTRICITY BILL', category: 'bills_utilities', category_confidence: 0.89, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 8, transaction_date: '2026-02-27', amount: '-649.00', currency: 'INR', merchant_name: 'Netflix', description: 'NETFLIX SUBSCRIPTION', category: 'entertainment', category_confidence: 0.97, instrument_type: 'credit_card', source_count: 1, credit_card_label: 'ICICI ••1198', bank_account_label: null },
  { id: 9, transaction_date: '2026-02-26', amount: '-425.00', currency: 'INR', merchant_name: 'Uber', description: 'UBER TRIP', category: 'travel_transport', category_confidence: 0.94, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 10, transaction_date: '2026-02-25', amount: '-25000.00', currency: 'INR', merchant_name: 'Landlord', description: 'HOUSE RENT TRANSFER', category: 'investment_finance', category_confidence: 0.96, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 11, transaction_date: '2026-02-24', amount: '4200.00', currency: 'INR', merchant_name: 'SBI', description: 'FD INTEREST', category: 'investment_finance', category_confidence: 0.99, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'SBI ••3210' },
  { id: 12, transaction_date: '2026-02-22', amount: '-2500.00', currency: 'INR', merchant_name: 'Cult.fit', description: 'CULT.FIT MEMBERSHIP', category: 'healthcare', category_confidence: 0.91, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 13, transaction_date: '2026-02-20', amount: '35000.00', currency: 'INR', merchant_name: 'Client', description: 'FREELANCE PAYMENT', category: 'investment_finance', category_confidence: 0.97, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 14, transaction_date: '2026-02-18', amount: '-599.00', currency: 'INR', merchant_name: 'Jio', description: 'MOBILE RECHARGE', category: 'bills_utilities', category_confidence: 0.93, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 15, transaction_date: '2026-02-17', amount: '-3200.00', currency: 'INR', merchant_name: 'BigBasket', description: 'BIGBASKET ORDER', category: 'groceries', category_confidence: 0.94, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 16, transaction_date: '2026-02-15', amount: '-4350.00', currency: 'INR', merchant_name: 'BigBasket', description: 'BIGBASKET GROCERIES', category: 'groceries', category_confidence: 0.94, instrument_type: 'credit_card', source_count: 1, credit_card_label: 'HDFC ••6677', bank_account_label: null },
  { id: 17, transaction_date: '2026-02-14', amount: '-2800.00', currency: 'INR', merchant_name: 'HP Petrol', description: 'PETROL HP', category: 'travel_transport', category_confidence: 0.90, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 18, transaction_date: '2026-02-10', amount: '-12000.00', currency: 'INR', merchant_name: 'HDFC Life', description: 'INSURANCE PREMIUM', category: 'healthcare', category_confidence: 0.95, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 19, transaction_date: '2026-02-08', amount: '50000.00', currency: 'INR', merchant_name: 'Self Transfer', description: 'NEFT SAVINGS TRANSFER', category: 'transfers_payments', category_confidence: 0.88, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
  { id: 20, transaction_date: '2026-02-05', amount: '-7899.00', currency: 'INR', merchant_name: 'Flipkart', description: 'FLIPKART ORDER', category: 'ecommerce', category_confidence: 0.93, instrument_type: 'bank_credit', source_count: 1, credit_card_label: null, bank_account_label: 'HDFC •••4521' },
]

const demoSubscriptions: Subscription[] = [
  { id: 1, name: 'Netflix', category: 'Entertainment', cost: '649', currency: 'INR', cycle: 'monthly', renew_date: '2026-03-27', status: 'active', icon: '🎬', color: '#e50914', description: 'Premium 4K plan', start_date: '2022-06-15', payment_method: 'HDFC ••6677', plan: 'Premium', total_spent: '29205', last_billed: '2026-02-27', auto_renew: true, source: 'email', confidence: 0.97, payment_count: 45 },
  { id: 2, name: 'Spotify', category: 'Music', cost: '119', currency: 'INR', cycle: 'monthly', renew_date: '2026-04-05', status: 'active', icon: '🎵', color: '#1db954', description: 'Individual plan', start_date: '2023-01-10', payment_method: 'SBI ••3210', plan: 'Individual', total_spent: '3094', last_billed: '2026-03-05', auto_renew: true, source: 'email', confidence: 0.96, payment_count: 26 },
  { id: 3, name: 'YouTube Premium', category: 'Entertainment', cost: '149', currency: 'INR', cycle: 'monthly', renew_date: '2026-03-18', status: 'active', icon: '📺', color: '#ff0000', description: 'Individual plan', start_date: '2023-08-20', payment_method: 'HDFC ••6677', plan: 'Individual', total_spent: '4619', last_billed: '2026-02-18', auto_renew: true, source: 'email', confidence: 0.95, payment_count: 31 },
  { id: 4, name: 'iCloud+', category: 'Storage', cost: '219', currency: 'INR', cycle: 'monthly', renew_date: '2026-03-12', status: 'active', icon: '☁️', color: '#007aff', description: '200GB storage', start_date: '2021-11-05', payment_method: 'ICICI ••1198', plan: '200GB', total_spent: '11388', last_billed: '2026-02-12', auto_renew: true, source: 'email', confidence: 0.98, payment_count: 52 },
  { id: 5, name: 'ChatGPT Plus', category: 'Productivity', cost: '1650', currency: 'INR', cycle: 'monthly', renew_date: '2026-03-22', status: 'active', icon: '🤖', color: '#10a37f', description: 'Plus plan', start_date: '2024-02-01', payment_method: 'HDFC ••6677', plan: 'Plus', total_spent: '39600', last_billed: '2026-02-22', auto_renew: true, source: 'email', confidence: 0.94, payment_count: 24 },
  { id: 6, name: 'Zerodha', category: 'Finance', cost: '2400', currency: 'INR', cycle: 'yearly', renew_date: '2026-08-15', status: 'active', icon: '📈', color: '#387ed1', description: 'Standard brokerage', start_date: '2021-08-15', payment_method: 'ICICI Net Banking', plan: 'Standard', total_spent: '12000', last_billed: '2025-08-15', auto_renew: true, source: 'email', confidence: 0.99, payment_count: 5 },
  { id: 7, name: 'Amazon Prime', category: 'Shopping', cost: '1499', currency: 'INR', cycle: 'yearly', renew_date: '2026-06-01', status: 'active', icon: '📦', color: '#ff9900', description: 'Annual membership', start_date: '2020-06-01', payment_method: 'HDFC ••6677', plan: 'Annual', total_spent: '8994', last_billed: '2025-06-01', auto_renew: true, source: 'email', confidence: 0.97, payment_count: 6 },
  { id: 8, name: 'Hotstar', category: 'Entertainment', cost: '299', currency: 'INR', cycle: 'monthly', renew_date: '2026-03-30', status: 'active', icon: '⭐', color: '#00458f', description: 'Super plan', start_date: '2024-09-15', payment_method: 'SBI ••3210', plan: 'Super', total_spent: '5382', last_billed: '2026-02-28', auto_renew: true, source: 'email', confidence: 0.96, payment_count: 18 },
  { id: 9, name: 'LinkedIn Premium', category: 'Career', cost: '1555', currency: 'INR', cycle: 'monthly', renew_date: '2026-04-02', status: 'cancelled', icon: '💼', color: '#0077b5', description: 'Career plan', start_date: '2025-04-02', payment_method: 'HDFC ••6677', plan: 'Career', total_spent: '17105', last_billed: '2026-01-02', auto_renew: false, source: 'email', confidence: 0.95, payment_count: 11 },
]

let demoSenderRules: SenderRule[] = [
  { id: 1, sender_pattern: '*@hdfcbank.com', source_type: 'credit_card', is_enabled: true, subject_pattern: 'Statement', require_attachment: true, priority: 1 },
  { id: 2, sender_pattern: '*@amazon.in', source_type: 'credit_card', is_enabled: true, subject_pattern: 'Order', require_attachment: false, priority: 2 },
  { id: 3, sender_pattern: '*@icicibank.com', source_type: 'credit_card', is_enabled: true, subject_pattern: 'Statement', require_attachment: true, priority: 3 },
]

const demoMessages: EmailMessageItem[] = [
  { id: 1, message_id: 'msg-001', sender: 'no-reply@hdfcbank.com', subject: 'Your HDFC Bank Credit Card Statement', received_at: '2026-02-16T10:30:00Z', snippet: 'Your credit card statement for Feb 2026 is now available...', source_type: 'credit_card', is_processed: true },
  { id: 2, message_id: 'msg-002', sender: 'shipment@amazon.in', subject: 'Your Amazon.in order has been shipped', received_at: '2026-03-08T14:30:00Z', snippet: 'Your order #402-1234567-1234567 has been shipped...', source_type: 'credit_card', is_processed: true },
  { id: 3, message_id: 'msg-003', sender: 'no-reply@icicibank.com', subject: 'ICICI Bank Credit Card Statement', received_at: '2026-02-23T09:00:00Z', snippet: 'Your credit card statement for Feb 2026 is ready...', source_type: 'credit_card', is_processed: true },
  { id: 4, message_id: 'msg-004', sender: 'info@cdn.groww.in', subject: 'SIP confirmation - Parag Parikh Flexi Cap Fund', received_at: '2026-03-05T07:00:00Z', snippet: 'Your SIP of ₹5,000 in PPFAS has been processed...', source_type: 'investment', is_processed: true },
  { id: 5, message_id: 'msg-005', sender: 'no-reply@hdfcbank.com', subject: 'Credit Card Statement - Jan 2026', received_at: '2026-01-16T10:30:00Z', snippet: 'Your credit card statement for Jan 2026...', source_type: 'credit_card', is_processed: true },
  { id: 6, message_id: 'msg-006', sender: 'info@cdn.groww.in', subject: 'SIP confirmation - Nifty 50 ETF', received_at: '2026-03-07T07:00:00Z', snippet: 'Your SIP of ₹3,000 in NIFTYBEES has been processed...', source_type: 'investment', is_processed: true },
  { id: 7, message_id: 'msg-007', sender: 'noreply@netflix.com', subject: 'Netflix receipt', received_at: '2026-02-27T00:00:00Z', snippet: 'Your Netflix subscription payment of ₹649 was processed...', source_type: 'credit_card', is_processed: true },
  { id: 8, message_id: 'msg-008', sender: 'info@cdn.groww.in', subject: 'Dividend credit - Reliance Industries', received_at: '2026-02-15T07:00:00Z', snippet: 'Dividend of ₹1800 from RELIANCE has been credited...', source_type: 'investment', is_processed: true },
]

const demoCategories: Category[] = [
  { slug: 'food', label: 'Food' },
  { slug: 'groceries', label: 'Groceries' },
  { slug: 'clothing', label: 'Clothing' },
  { slug: 'entertainment', label: 'Entertainment' },
  { slug: 'ecommerce', label: 'E-commerce' },
  { slug: 'travel_transport', label: 'Travel & Transport' },
  { slug: 'bills_utilities', label: 'Bills & Utilities' },
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'education', label: 'Education' },
  { slug: 'investment_finance', label: 'Investment & Finance' },
  { slug: 'services_misc', label: 'Services & Misc' },
  { slug: 'transfers_payments', label: 'Transfers & Payments' },
  { slug: 'uncategorized', label: 'Uncategorized' },
]

let nextAccountId = 5
let nextCardId = 3
let nextSyncJobId = 1
let nextRuleId = 4

interface DemoSyncJob {
  id: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_messages: number
  processed_messages: number
  new_messages: number
  extracted_count: number
  error_message: string
  started_at: number
  completed_at: number | null
  steps: PipelineStep[]
}

const demoSyncJobs = new Map<number, DemoSyncJob>()

function createDemoSyncJob(): SyncTriggerResponse {
  const id = nextSyncJobId++
  const job: DemoSyncJob = {
    id,
    status: 'running',
    total_messages: 247,
    processed_messages: 0,
    new_messages: 23,
    extracted_count: 0,
    error_message: '',
    started_at: NOW,
    completed_at: null,
    steps: [
      { step_name: 'fetch' as const, status: 'running' as const, total_items: 247, processed_items: 0, error_count: 0, error_message: '', started_at: new Date(NOW).toISOString(), completed_at: null },
      { step_name: 'classify' as const, status: 'pending' as const, total_items: 247, processed_items: 0, error_count: 0, error_message: '', started_at: null, completed_at: null },
      { step_name: 'parse' as const, status: 'pending' as const, total_items: 23, processed_items: 0, error_count: 0, error_message: '', started_at: null, completed_at: null },
      { step_name: 'materialize' as const, status: 'pending' as const, total_items: 23, processed_items: 0, error_count: 0, error_message: '', started_at: null, completed_at: null },
      { step_name: 'classify_transactions' as const, status: 'pending' as const, total_items: 156, processed_items: 0, error_count: 0, error_message: '', started_at: null, completed_at: null },
      { step_name: 'detect_subscriptions' as const, status: 'pending' as const, total_items: 0, processed_items: 0, error_count: 0, error_message: '', started_at: null, completed_at: null },
    ],
  }
  demoSyncJobs.set(id, job)
  return { sync_job_id: id }
}

function advanceSyncJob(job: DemoSyncJob): DemoSyncJob {
  const elapsed = Date.now() - job.started_at
  const steps = job.steps

  for (let i = 0; i < steps.length; i++) {
    const stepStart = i * 1800
    const stepEnd = stepStart + 1500
    const step = steps[i]

    if (elapsed < stepStart) break

    if (step.status === 'pending' || step.status === 'running') {
      step.started_at = new Date(job.started_at + stepStart).toISOString()
      if (elapsed >= stepEnd) {
        step.status = 'completed'
        step.processed_items = step.total_items
        step.completed_at = new Date(job.started_at + stepEnd).toISOString()
      } else {
        step.status = 'running'
        const progress = (elapsed - stepStart) / 1500
        step.processed_items = Math.floor(step.total_items * progress)
      }
    }
  }

  const allDone = steps.every(s => s.status === 'completed')
  if (allDone) {
    job.status = 'completed'
    job.completed_at = Date.now()
    job.processed_messages = 247
    job.extracted_count = 23
  }

  return job
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    items: items.slice(start, end),
    total: items.length,
    page,
    page_size: pageSize,
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function parsePathname(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname
  } catch {
    return url
  }
}

// ─── ROUTER ───────────────────────────────────────────────────

export function handleMockRequest(input: string, init?: RequestInit): Response {
  const method = (init?.method ?? 'GET').toUpperCase()
  const url = parsePathname(input)
  const qs = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '')
  const path = url.split('?')[0]

  // AUTH
  if (path === '/api/auth/me/' && method === 'GET') return json(demoProfile)
  if (path === '/api/auth/me/' && method === 'PATCH') {
    const body = JSON.parse(init?.body as string || '{}')
    demoProfile = { ...demoProfile, ...body }
    return json(demoProfile)
  }

  // BANKING ACCOUNTS
  if (path === '/api/banking/accounts/' && method === 'GET') return json(demoAccounts)
  if (path === '/api/banking/accounts/' && method === 'POST') {
    const body = JSON.parse(init?.body as string || '{}')
    const acc: BankAccount = {
      id: nextAccountId++,
      bank_name: body.bank_name || 'Unknown',
      account_number: body.account_number || '0000000000',
      account_holder_name: body.account_holder_name || 'Ammu Kutty',
      currency: body.currency || 'INR',
      transaction_count: 0,
    }
    demoAccounts.push(acc)
    return json(acc)
  }

  // BANKING ACCOUNT TRANSACTIONS
  const acctTxnMatch = path.match(/^\/api\/banking\/accounts\/(\d+)\/transactions\/?$/)
  if (acctTxnMatch && method === 'GET') {
    const acctId = Number(acctTxnMatch[1])
    const page = Number(qs.get('page') || '1')
    const pageSize = Number(qs.get('page_size') || '20')
    let txns = demoBankTransactions.filter(t => t.id % 4 === (acctId - 1) % 4 || t.id === 3)
    if (qs.get('type') === 'debit') txns = txns.filter(t => t.debit !== null)
    if (qs.get('type') === 'credit') txns = txns.filter(t => t.credit !== null)
    if (qs.get('search')) {
      const s = qs.get('search')!.toLowerCase()
      txns = txns.filter(t => t.description.toLowerCase().includes(s) || t.merchant_name.toLowerCase().includes(s))
    }
    if (qs.get('category')) txns = txns.filter(t => t.category === qs.get('category'))
    if (qs.get('year')) txns = txns.filter(t => t.transaction_date.startsWith(qs.get('year')!))
    if (qs.get('month')) {
      const m = qs.get('month')!.padStart(2, '0')
      txns = txns.filter(t => t.transaction_date.substring(5, 7) === m)
    }
    return json(paginate(txns, page, pageSize))
  }

  // BANKING UPLOAD
  const uploadMatch = path.match(/^\/api\/banking\/accounts\/(\d+)\/upload\/?$/)
  if (uploadMatch && method === 'POST') return json({ imported: 12, classified: 10, account_id: Number(uploadMatch[1]) } satisfies UploadResult)

  // BANKING SUMMARY
  if (path === '/api/banking/summary/' && method === 'GET') {
    const year = Number(qs.get('year') || new Date().getFullYear())
    const data: MonthlySummary[] = []
    for (let m = 1; m <= 2; m++) {
      data.push({
        year,
        month: m,
        total_debit: String(120000 + Math.floor(Math.random() * 50000)),
        total_credit: String(240000 + Math.floor(Math.random() * 40000)),
        net: String(50000 + Math.floor(Math.random() * 30000)),
      })
    }
    return json(data)
  }

  // CREDIT CARDS
  if (path === '/api/banking/cards/' && method === 'GET') return json(demoCards)
  if (path === '/api/banking/cards/' && method === 'POST') {
    const body = JSON.parse(init?.body as string || '{}')
    const card: CreditCard = {
      id: nextCardId++,
      issuer: body.issuer || 'Unknown',
      card_last4: body.card_last4 || '0000',
      card_name: body.card_name || '',
      billing_day: body.billing_day ?? null,
      credit_limit: body.credit_limit ?? null,
      currency: body.currency || 'INR',
      transaction_count: 0,
      last_bill_total: null,
      last_bill_date: null,
    }
    demoCards.push(card)
    return json(card)
  }

  // CARD BILLS
  const cardBillsMatch = path.match(/^\/api\/banking\/cards\/(\d+)\/bills\/?$/)
  if (cardBillsMatch && method === 'GET') {
    const cardId = Number(cardBillsMatch[1])
    return json(demoCardBills.filter(b => (b.id <= 2 && cardId === 1) || (b.id > 2 && cardId === 2)))
  }

  // CARD TRANSACTIONS
  const cardTxnMatch = path.match(/^\/api\/banking\/cards\/(\d+)\/transactions\/?$/)
  if (cardTxnMatch && method === 'GET') {
    const cardId = Number(cardTxnMatch[1])
    const page = Number(qs.get('page') || '1')
    const pageSize = Number(qs.get('page_size') || '20')
    let txns = demoCardTransactions.filter(t =>
      (cardId === 1 && t.id <= 108) || (cardId === 2 && t.id > 108)
    )
    if (qs.get('search')) {
      const s = qs.get('search')!.toLowerCase()
      txns = txns.filter(t => t.description.toLowerCase().includes(s))
    }
    if (qs.get('category')) txns = txns.filter(t => t.category === qs.get('category'))
    if (qs.get('year')) txns = txns.filter(t => t.transaction_date.startsWith(qs.get('year')!))
    if (qs.get('month')) {
      const m = qs.get('month')!.padStart(2, '0')
      txns = txns.filter(t => t.transaction_date.substring(5, 7) === m)
    }
    return json(paginate(txns, page, pageSize) as CCTransactionList)
  }

  // MATERIALIZE
  if (path === '/api/banking/cards/materialize/' && method === 'POST') {
    return json({ cards: 2, bills: 4, transactions: 12 } satisfies MaterializeResult)
  }

  // CLASSIFY CARD TRANSACTIONS
  const classifyCardMatch = path.match(/^\/api\/banking\/cards\/(\d+)\/classify\/?$/)
  if (classifyCardMatch && method === 'POST') {
    return json({ classified: 12 } satisfies { classified: number })
  }

  // UNIFIED TRANSACTIONS
  if (path === '/api/banking/transactions/unified/' && method === 'GET') {
    const page = Number(qs.get('page') || '1')
    const pageSize = Number(qs.get('page_size') || '20')
    let txns = [...demoUnifiedTransactions]
    if (qs.get('instrument_type')) txns = txns.filter(t => t.instrument_type === qs.get('instrument_type'))
    if (qs.get('category')) txns = txns.filter(t => t.category === qs.get('category'))
    if (qs.get('search')) {
      const s = qs.get('search')!.toLowerCase()
      txns = txns.filter(t => t.description.toLowerCase().includes(s) || t.merchant_name.toLowerCase().includes(s))
    }
    if (qs.get('year')) txns = txns.filter(t => t.transaction_date.startsWith(qs.get('year')!))
    if (qs.get('month')) {
      const m = qs.get('month')!.padStart(2, '0')
      txns = txns.filter(t => t.transaction_date.substring(5, 7) === m)
    }
    if (qs.get('exclude_transfers') === 'true') txns = txns.filter(t => t.category !== 'transfers_payments')
    if (qs.get('sort') === '-transaction_date') txns.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    return json(paginate(txns, page, pageSize) as UnifiedTransactionList)
  }

  // UNIFIED TRANSACTION DETAIL
  const unifiedDetailMatch = path.match(/^\/api\/banking\/transactions\/unified\/(\d+)\/?$/)
  if (unifiedDetailMatch && method === 'GET') {
    const id = Number(unifiedDetailMatch[1])
    const txn = demoUnifiedTransactions.find(t => t.id === id)
    if (!txn) return json({ detail: 'Not found' }, 404)
    const detail: UnifiedTransactionDetail = {
      ...txn,
      sources: [
        { id: 1, source_type: 'email', raw_description: txn.description, raw_amount: txn.amount, raw_currency: 'INR', priority: 1, email_subject: `Statement for ${txn.merchant_name}`, gmail_message_id: 'msg-001' },
      ],
    }
    return json(detail)
  }

  // MONTHLY SPENDING
  if (path === '/api/banking/spending/monthly/' && method === 'GET') {
    const data: MonthlySpending[] = [
      { year: 2025, month: 10, month_label: 'Oct 2025', income: '240000', expense: '168000', savings: '72000' },
      { year: 2025, month: 11, month_label: 'Nov 2025', income: '245000', expense: '182000', savings: '63000' },
      { year: 2025, month: 12, month_label: 'Dec 2025', income: '275000', expense: '210000', savings: '65000' },
      { year: 2026, month: 1, month_label: 'Jan 2026', income: '240000', expense: '175000', savings: '65000' },
      { year: 2026, month: 2, month_label: 'Feb 2026', income: '279200', expense: '195000', savings: '84200' },
      { year: 2026, month: 3, month_label: 'Mar 2026', income: '240000', expense: '112000', savings: '128000' },
    ]
    if (qs.get('year')) {
      const yr = Number(qs.get('year'))
      return json(data.filter(d => d.year === yr))
    }
    return json(data)
  }

  // SPENDING SUMMARY
  if (path === '/api/banking/spending/summary/' && method === 'GET') {
    const data: SpendingSummary = {
      total_spending: '195000',
      total_income: '279200',
      transaction_count: 87,
      categories: [
        { category: 'investment_finance', total: '75000', count: 5 },
        { category: 'ecommerce', total: '34998', count: 6 },
        { category: 'food', total: '22105', count: 12 },
        { category: 'bills_utilities', total: '18639', count: 8 },
        { category: 'travel_transport', total: '16225', count: 9 },
        { category: 'clothing', total: '10800', count: 3 },
        { category: 'entertainment', total: '9348', count: 4 },
        { category: 'services_misc', total: '5768', count: 3 },
        { category: 'healthcare', total: '4900', count: 2 },
        { category: 'groceries', total: '7550', count: 3 },
      ],
    }
    return json(data)
  }

  // SUBSCRIPTIONS
  if (path === '/api/banking/subscriptions/' && method === 'GET') {
    let subs = [...demoSubscriptions]
    if (qs.get('status')) subs = subs.filter(s => s.status === qs.get('status'))
    if (qs.get('category')) subs = subs.filter(s => s.category === qs.get('category'))
    return json({ items: subs, total: subs.length } satisfies SubscriptionList)
  }
  if (path === '/api/banking/subscriptions/detect/' && method === 'POST') {
    return json({ detected: 5, created: 2, payments_linked: 8 } satisfies DetectResult)
  }
  const subUpdateMatch = path.match(/^\/api\/banking\/subscriptions\/(\d+)\/?$/)
  if (subUpdateMatch && method === 'PATCH') {
    const id = Number(subUpdateMatch[1])
    const body = JSON.parse(init?.body as string || '{}')
    const idx = demoSubscriptions.findIndex(s => s.id === id)
    if (idx === -1) return json({ detail: 'Not found' }, 404)
    demoSubscriptions[idx] = { ...demoSubscriptions[idx], ...body }
    return json(demoSubscriptions[idx])
  }

  // GMAIL STATUS
  if (path === '/api/gmail/status' && method === 'GET') {
    const status: GmailStatus = {
      connected: true,
      email: 'ammu@finnlens.com',
      last_sync_at: new Date(NOW - 2 * HOUR).toISOString(),
      is_active: true,
      needs_reauth: false,
      reauth_reason: '',
    }
    return json(status)
  }

  // GMAIL DISCONNECT
  if (path === '/api/gmail/disconnect' && method === 'POST') {
    return json(null, 204)
  }

  // GMAIL SYNC
  if (path === '/api/gmail/sync' && method === 'POST') {
    return json(createDemoSyncJob())
  }

  // GMAIL SYNC JOB
  const syncJobMatch = path.match(/^\/api\/gmail\/sync-jobs\/(\d+)\/?$/)
  if (syncJobMatch && method === 'GET') {
    const id = Number(syncJobMatch[1])
    const job = demoSyncJobs.get(id)
    if (!job) return json({ detail: 'Not found' }, 404)
    const advanced = advanceSyncJob(job)
    return json({
      id: advanced.id,
      status: advanced.status,
      total_messages: advanced.total_messages,
      processed_messages: advanced.processed_messages,
      new_messages: advanced.new_messages,
      extracted_count: advanced.extracted_count,
      error_message: advanced.error_message,
      started_at: new Date(advanced.started_at).toISOString(),
      completed_at: advanced.completed_at ? new Date(advanced.completed_at).toISOString() : null,
      steps: advanced.steps,
    } satisfies SyncJob)
  }

  // GMAIL MESSAGES
  if (path === '/api/gmail/messages' && method === 'GET') {
    const page = Number(qs.get('page') || '1')
    const pageSize = Number(qs.get('page_size') || '20')
    let msgs = [...demoMessages]
    if (qs.get('source_type')) msgs = msgs.filter(m => m.source_type === qs.get('source_type'))
    return json(paginate(msgs, page, pageSize) as EmailMessageList)
  }

  // GMAIL RULES
  if (path === '/api/gmail/rules' && method === 'GET') return json(demoSenderRules)
  if (path === '/api/gmail/rules' && method === 'POST') {
    const body = JSON.parse(init?.body as string || '{}')
    const rule: SenderRule = {
      id: nextRuleId++,
      sender_pattern: body.sender_pattern || '*',
      source_type: body.source_type || 'credit_card',
      is_enabled: body.is_enabled ?? true,
      subject_pattern: '',
      require_attachment: false,
      priority: nextRuleId,
    }
    demoSenderRules.push(rule)
    return json(rule)
  }
  const ruleUpdateMatch = path.match(/^\/api\/gmail\/rules\/(\d+)\/?$/)
  if (ruleUpdateMatch && method === 'PATCH') {
    const id = Number(ruleUpdateMatch[1])
    const body = JSON.parse(init?.body as string || '{}')
    const idx = demoSenderRules.findIndex(r => r.id === id)
    if (idx === -1) return json({ detail: 'Not found' }, 404)
    demoSenderRules[idx] = { ...demoSenderRules[idx], ...body }
    return json(demoSenderRules[idx])
  }
  if (ruleUpdateMatch && method === 'DELETE') {
    const id = Number(ruleUpdateMatch[1])
    demoSenderRules = demoSenderRules.filter(r => r.id !== id)
    return json(null, 204)
  }

  // GMAIL EXTRACTED DATA
  if (path === '/api/gmail/extracted' && method === 'GET') {
    const data: ExtractedData[] = [
      { id: 1, email_id: 1, data_type: 'credit_card_statement', data_json: { card: 'HDFC ••6677', month: 'Feb 2026' }, confidence: 0.95, is_verified: true, created_at: '2026-02-16T10:30:00Z' },
      { id: 2, email_id: 3, data_type: 'credit_card_statement', data_json: { card: 'ICICI ••1198', month: 'Feb 2026' }, confidence: 0.92, is_verified: true, created_at: '2026-02-23T09:00:00Z' },
      { id: 3, email_id: 4, data_type: 'investment_transaction', data_json: { scheme: 'PPFAS', amount: 5000, type: 'SIP' }, confidence: 0.98, is_verified: true, created_at: '2026-03-05T07:00:00Z' },
      { id: 4, email_id: 6, data_type: 'investment_transaction', data_json: { scheme: 'NIFTYBEES', amount: 3000, type: 'SIP' }, confidence: 0.97, is_verified: false, created_at: '2026-03-07T07:00:00Z' },
      { id: 5, email_id: 8, data_type: 'investment_transaction', data_json: { scheme: 'RELIANCE', amount: 1800, type: 'DIVIDEND' }, confidence: 0.96, is_verified: true, created_at: '2026-02-15T07:00:00Z' },
    ]
    if (qs.get('data_type')) return json(data.filter(d => d.data_type === qs.get('data_type')))
    return json(data)
  }

  // GMAIL EXTRACTED VERIFY
  const extractedVerifyMatch = path.match(/^\/api\/gmail\/extracted\/(\d+)\/verify\/?$/)
  if (extractedVerifyMatch && method === 'POST') {
    return json(null, 204)
  }

  // GMAIL INVESTMENTS
  if (path === '/api/gmail/investments' && method === 'GET') {
    const data: InvestmentSummary = {
      total_invested: 379600,
      total_current: 429750,
      total_pnl: 50150,
      total_pnl_pct: 13.21,
      holdings_count: 6,
      holdings: [
        { scheme_name: 'Parag Parikh Flexi Cap Fund Direct Growth', total_units: 800.12, total_invested: 57600, latest_nav: 81.45, current_value: 65170, pnl: 7570, pnl_pct: 13.14, sip_count: 24, last_allocated: '2026-03-05' } satisfies MFHolding,
        { scheme_name: 'Nifty 50 ETF', total_units: 200.00, total_invested: 49000, latest_nav: 262.30, current_value: 52460, pnl: 3460, pnl_pct: 7.06, sip_count: 12, last_allocated: '2026-03-07' } satisfies MFHolding,
        { scheme_name: 'Axis Bluechip Fund Direct Growth', total_units: 350.50, total_invested: 63000, latest_nav: 58.20, current_value: 20399, pnl: -42601, pnl_pct: -67.62, sip_count: 18, last_allocated: '2026-02-05' } satisfies MFHolding,
        { scheme_name: 'Mirae Asset Large Cap Fund Direct Growth', total_units: 150.25, total_invested: 52000, latest_nav: 89.75, current_value: 13485, pnl: -38515, pnl_pct: -74.07, sip_count: 15, last_allocated: '2026-01-05' } satisfies MFHolding,
        { scheme_name: 'Kotak Emerging Equity Fund Direct Growth', total_units: 420.75, total_invested: 78000, latest_nav: 105.40, current_value: 44347, pnl: -33653, pnl_pct: -43.14, sip_count: 20, last_allocated: '2026-03-10' } satisfies MFHolding,
        { scheme_name: 'SBI Small Cap Fund Direct Growth', total_units: 180.30, total_invested: 80000, latest_nav: 152.80, current_value: 27555, pnl: -52445, pnl_pct: -65.56, sip_count: 18, last_allocated: '2026-02-15' } satisfies MFHolding,
      ],
      upcoming_sips: [
        { scheme_name: 'Parag Parikh Flexi Cap Fund Direct Growth', amount: 5000, due_date: '2026-04-05' } satisfies UpcomingSIP,
        { scheme_name: 'Nifty 50 ETF', amount: 3000, due_date: '2026-04-07' } satisfies UpcomingSIP,
        { scheme_name: 'Kotak Emerging Equity Fund Direct Growth', amount: 10000, due_date: '2026-04-10' } satisfies UpcomingSIP,
        { scheme_name: 'Mirae Asset Large Cap Fund Direct Growth', amount: 5000, due_date: '2026-04-05' } satisfies UpcomingSIP,
        { scheme_name: 'SBI Small Cap Fund Direct Growth', amount: 8000, due_date: '2026-04-15' } satisfies UpcomingSIP,
        { scheme_name: 'Axis Bluechip Fund Direct Growth', amount: 5000, due_date: '2026-04-05' } satisfies UpcomingSIP,
      ],
    }
    return json(data)
  }

  // OAUTH
  if (path === '/api/oauth/google/auth-url' && method === 'GET') {
    return json({ url: 'about:blank#demo-mode-no-oauth', code_verifier: 'demo-verifier' })
  }
  if (path === '/api/oauth/google/callback' && method === 'POST') {
    return json({ email: 'demo@finnlens.com', connected: true })
  }

  // CLASSIFIER
  if (path === '/api/classifier/categories/' && method === 'GET') return json(demoCategories)

  const classifyAcctMatch = path.match(/^\/api\/classifier\/accounts\/(\d+)\/classify\/?$/)
  if (classifyAcctMatch && method === 'POST') {
    return json({ classified: 45, total: 48, account_id: Number(classifyAcctMatch[1]) } satisfies ClassifyResult)
  }

  const overrideCatMatch = path.match(/^\/api\/classifier\/transactions\/(\d+)\/category\/?$/)
  if (overrideCatMatch && method === 'PUT') {
    const txnId = Number(overrideCatMatch[1])
    const body = JSON.parse(init?.body as string || '{}')
    const category = body.category || 'uncategorized'
    for (const txn of demoBankTransactions) {
      if (txn.id === txnId) { txn.category = category; txn.is_user_categorized = true; break }
    }
    for (const txn of demoUnifiedTransactions) {
      if (txn.id === txnId) { txn.category = category; break }
    }
    for (const txn of demoCardTransactions) {
      if (txn.id === txnId) { txn.category = category; txn.is_user_categorized = true; break }
    }
    return json({ id: txnId, category, is_user_categorized: true })
  }

  return json({ detail: 'Not found' }, 404)
}
