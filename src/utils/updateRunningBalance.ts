const updateRunningBalanceBasedOnPreviousTransaction = (runningBalance: number, i: number, historyTransactions: any[]) => {
  const previousTxn = historyTransactions[i - 1];
  if (previousTxn?.type === "BUY") {
    return runningBalance - Number(previousTxn.totalAmount || 0);
  }
  if (previousTxn?.type === "PAYMENT") {
    return runningBalance + Number(previousTxn?.totalAmount || 0);
  }
  if (previousTxn?.type === "SELL") {
    return runningBalance + Number(previousTxn?.totalAmount || 0) - Number(previousTxn?.paymentCash || 0) - Number(previousTxn?.paymentUpi || 0);
  }
  if (previousTxn?.type === "RECEIVE_PAYMENT") {
    return runningBalance - Number(previousTxn?.totalAmount || 0);
  }
  return runningBalance;
};

export const updateRunningBalance = (runningBalance: number, i: number, historyTransactions: any[]) => {
  if (i === 0) return runningBalance;

  const txn = historyTransactions[i];
  const type = txn.type;
  const amount = Number(txn.totalAmount || 0);
  const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
  return updateRunningBalanceBasedOnPreviousTransaction(runningBalance, i, historyTransactions);
};

export const getPreviousDepositBasedOnTypeForCustomer = (transaction: any) => {
  if (transaction.type === "SELL") {
    return Number(transaction?.paymentCash || 0) + Number(transaction?.paymentUpi) - Number(transaction?.totalAmount);
  }
  if (transaction.type === "BUY") {
    return Number(transaction.totalAmount || 0);
  }
  if (transaction.type === "PAYMENT") {
    return -Number(transaction.totalAmount || 0);
  }
  if (transaction.type === "RECEIVE_PAYMENT") {
    return Number(transaction.totalAmount || 0);
  }
  return 0;
};

const updateRunningBalanceForBuyForCustomer = (runningBalance: number, i: number, historyTransactions: any[]) => {
  const txn = historyTransactions[i];
  const type = txn.type;
  const amount = Number(txn.totalAmount || 0);
  const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
  const previousTxn = historyTransactions[i - 1];
  if (previousTxn?.type === "BUY") {
    return runningBalance + Number(previousTxn.totalAmount || 0);
  }
  if (previousTxn?.type === "PAYMENT") {
    return runningBalance - Number(previousTxn?.totalAmount || 0);
  }
  if (previousTxn?.type === "SELL") {
    return runningBalance - Number(previousTxn?.totalAmount || 0) + Number(previousTxn?.paymentCash || 0) + Number(previousTxn?.paymentUpi || 0);
  }
  if (previousTxn?.type === "RECEIVE_PAYMENT") {
    return runningBalance + Number(previousTxn?.totalAmount || 0);
  }
  if (previousTxn?.type === "ADVANCE_PAYMENT") {
    return runningBalance + Number(previousTxn?.totalAmount || 0);
  }
  if (previousTxn?.type === "CREDIT_NOTE") {
    return runningBalance + Number(previousTxn?.totalAmount || 0);
  }
  if (previousTxn?.type === "DEBIT_NOTE") {
    return runningBalance - Number(previousTxn?.totalAmount || 0);
  }
  return runningBalance;
};

export const updateRunningBalanceForCustomer = (runningBalance: number, i: number, historyTransactions: any[]) => {
  if (i === 0) return runningBalance;

  const txn = historyTransactions[i];
  const type = txn.type;
  const amount = Number(txn.totalAmount || 0);
  const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
  const previousDeposit = getPreviousDepositBasedOnTypeForCustomer(historyTransactions[i - 1]);

  return updateRunningBalanceForBuyForCustomer(runningBalance, i, historyTransactions);
};
