const getPreviousDepositBasedOnType = (transaction:any)=>{
    if(transaction.type === "SELL"){
        return Number(transaction?.totalAmount)
    }
    if(transaction.type === "PAYMENT"){
        return Number(transaction.totalAmount || 0)
    }
    if(transaction.type === "RECEIVE_PAYMENT"){
        return Number(transaction.totalAmount || 0);
    }
    return 0;
}

export const updateRunningBalance = (runningBalance: number, i: number, historyTransactions: any[]) => {
    if (i === 0)return runningBalance;
    
    const txn = historyTransactions[i];
    const type = txn.type;
    const amount = Number(txn.totalAmount || 0);
    const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
    const previousDeposit = getPreviousDepositBasedOnType(historyTransactions[i-1])

    if (type === "BUY") {
        return runningBalance +previousDeposit;
    }
    if (type === "SELL") {
        return runningBalance - previousDeposit - deposit;
    }
    if (type === "PAYMENT") {
        return runningBalance +previousDeposit;
    }
    if (type === "RECEIVE_PAYMENT") {
        return runningBalance + deposit;
    }
    return runningBalance
};

export const getPreviousDepositBasedOnTypeForCustomer = (transaction:any)=>{
    if(transaction.type === "SELL"){
        return Number(transaction?.paymentCash || 0)+Number(transaction?.paymentUpi)-Number(transaction?.totalAmount)
    }
    if(transaction.type === "BUY"){
        return Number(transaction.totalAmount || 0)
    }
    if(transaction.type === "PAYMENT"){
        return -Number(transaction.totalAmount || 0)
    }
    if(transaction.type === "RECEIVE_PAYMENT"){
        return Number(transaction.totalAmount || 0);
    }
    return 0;
}

const updateRunningBalanceForBuy = (runningBalance: number, i: number, historyTransactions: any[]) => {
    if (i === 0)return runningBalance;
    
    const txn = historyTransactions[i];
    const type = txn.type;
    const amount = Number(txn.totalAmount || 0);
    const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
    const previousTxn =historyTransactions[i-1];

    if(previousTxn.type === "PAYMENT"){
        return runningBalance - Number(previousTxn.totalAmount || 0);
    }
    if(previousTxn.type === "SELL"){
        return runningBalance- Number(previousTxn?.totalAmount || 0) + Number(previousTxn?.paymentCash || 0) + Number(previousTxn?.paymentUpi || 0);

    }
}
const updateRunningBalanceForSell = (runningBalance: number, i: number, historyTransactions: any[]) => {
    if (i === 0)return runningBalance;
    
    const txn = historyTransactions[i];
    const type = txn.type;
    const amount = Number(txn.totalAmount || 0);
    const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
    const previousTxn =historyTransactions[i-1];
    if(previousTxn.type === "PAYMENT"){
        return runningBalance + Number(previousTxn.totalAmount || 0);
    }
    if(previousTxn.type === "BUY"){
        return runningBalance + Number(previousTxn.totalAmount || 0)
    }
}
const updateRunningBalanceForPayment = (runningBalance: number, i: number, historyTransactions: any[]) => {
    if (i === 0)return runningBalance;
    
    const txn = historyTransactions[i];
    const type = txn.type;
    const amount = Number(txn.totalAmount || 0);
    const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
    const previousTxn =historyTransactions[i-1];
    if(previousTxn?.type === "BUY"){
        return runningBalance + Number(previousTxn.totalAmount || 0);
    }
    if(previousTxn?.type === "PAYMENT"){
        return runningBalance-Number(previousTxn?.totalAmount||0)
    }
}
const updateRunningBalanceForReceivePayment = (runningBalance: number, i: number, historyTransactions: any[]) => {
    if (i === 0)return runningBalance;
    
    const txn = historyTransactions[i];
    const type = txn.type;
    const amount = Number(txn.totalAmount || 0);
    const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
    const previousTxn =historyTransactions[i-1];
}
export const updateRunningBalanceForCustomer = (runningBalance: number, i: number, historyTransactions: any[]) => {
    if (i === 0)return runningBalance;
    
    const txn = historyTransactions[i];
    const type = txn.type;
    const amount = Number(txn.totalAmount || 0);
    const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
    const previousDeposit = getPreviousDepositBasedOnTypeForCustomer(historyTransactions[i-1])

    if(type === "PAYMENT"){
        return updateRunningBalanceForPayment(runningBalance, i, historyTransactions);
    }
    if(type === "BUY"){
        return updateRunningBalanceForBuy(runningBalance, i, historyTransactions);
    }
    if(type === "SELL"){
        return updateRunningBalanceForSell(runningBalance, i, historyTransactions);
    }
    if(type === "RECEIVE_PAYMENT"){
        return updateRunningBalanceForReceivePayment(runningBalance, i, historyTransactions);
    }
    return runningBalance;
}