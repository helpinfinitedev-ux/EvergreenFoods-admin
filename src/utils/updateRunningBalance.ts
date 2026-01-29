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
        return Number(transaction?.totalAmount)
    }
    if(transaction.type === "BUY"){
        return Number(transaction.totalAmount || 0)
    }
    if(transaction.type === "PAYMENT"){
        return Number(transaction.totalAmount || 0)
    }
    if(transaction.type === "RECEIVE_PAYMENT"){
        return Number(transaction.totalAmount || 0);
    }
    return 0;
}

export const updateRunningBalanceForCustomer = (runningBalance: number, i: number, historyTransactions: any[]) => {
    if (i === 0)return runningBalance;
    
    const txn = historyTransactions[i];
    const type = txn.type;
    const amount = Number(txn.totalAmount || 0);
    const deposit = Number(txn.paymentCash || 0) + Number(txn.paymentUpi || 0);
    const previousDeposit = getPreviousDepositBasedOnTypeForCustomer(historyTransactions[i-1])

    if(type === "PAYMENT"){
        return (runningBalance -previousDeposit) ;
    }
    if(type === "BUY"){
        runningBalance-=previousDeposit;
    }
    if(type === "SELL"){
        runningBalance = runningBalance+previousDeposit-deposit+amount;
    }
    return runningBalance;
}