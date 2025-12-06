// Voucher Hoarder Insight Calculator

import { ParsedData } from '../../types/data.types';
import { Insight, VoucherHoarderData } from '../../types/insight.types';
import { isPast } from '../../utils/dateUtils';

/**
 * Calculate Voucher Hoarder insight
 * Tracks expired vs active vouchers
 */
export function calculateVoucherHoarderInsight(
  data: ParsedData
): Insight<VoucherHoarderData> | null {
  const { voucherRewards } = data;

  if (voucherRewards.length === 0) return null;

  const totalVouchers = voucherRewards.length;
  let expired = 0;
  let active = 0;

  voucherRewards.forEach(voucher => {
    if (isPast(voucher.expiryDate)) {
      expired++;
    } else {
      active++;
    }
  });

  const wastePercentage = Math.round((expired / totalVouchers) * 100);

  // Generate message
  let message = `You got ${totalVouchers} voucher${totalVouchers === 1 ? '' : 's'}. `;

  if (expired > 0) {
    message += `You let ${expired} expire! `;
    message += `That's ${wastePercentage}% wasted. `;

    if (wastePercentage === 100) {
      message += 'Every. Single. One. 😱';
    } else if (wastePercentage >= 75) {
      message += 'Maybe set some reminders? 📅';
    } else if (wastePercentage >= 50) {
      message += 'Half wasted, half saved. Balanced? 🤷';
    } else if (wastePercentage >= 25) {
      message += 'Not too bad, could be better!';
    } else {
      message += 'You mostly use them! Nice! ✨';
    }
  } else {
    message += `All ${active} are still active! You're on top of it! 🎯`;
  }

  return {
    type: 'voucher_hoarder',
    title: 'Voucher Hoarder',
    tone: 'funny',
    data: {
      totalVouchers,
      expired,
      active,
      wastePercentage
    },
    message
  };
}
