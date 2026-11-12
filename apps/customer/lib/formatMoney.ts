export const formatMoney = (value: number) => `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
