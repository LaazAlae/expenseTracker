const { getData, saveData } = require('./database');

/**
 * CENTRALIZED BUDGET MANAGER - THE SINGLE SOURCE OF TRUTH
 * 
 * This is the ONLY place where budget calculations happen.
 * ALL operations MUST go through this manager to ensure consistency.
 * NO calculations should happen anywhere else in the codebase.
 */
class BudgetManager {
  constructor() {
    // Mutex-like locks for each user to prevent concurrent modifications
    this.userLocks = new Map();
    this.operationQueue = new Map(); // Queue operations per user
  }

  /**
   * Get exclusive lock for user operations
   */
  async getUserLock(userId) {
    if (this.userLocks.has(userId)) {
      // Wait for existing lock to release
      await this.userLocks.get(userId);
    }
    
    let resolveLock;
    const lockPromise = new Promise(resolve => {
      resolveLock = resolve;
    });
    
    this.userLocks.set(userId, lockPromise);
    return resolveLock;
  }

  /**
   * Release user lock
   */
  releaseUserLock(userId) {
    this.userLocks.delete(userId);
  }

  /**
   * ATOMIC OPERATION: Calculate user's complete budget state
   * This is the SINGLE SOURCE OF TRUTH for budget calculations
   */
  calculateUserBudgetState(userId) {
    const data = getData();
    const userBudget = data.userData[userId];
    
    if (!userBudget) {
      return {
        totalFundsAdded: 0,
        totalExpenses: 0,
        availableBudget: 0,
        transactions: [],
        transactionCount: 0
      };
    }

    // Separate fund additions from expenses
    const fundAdditions = userBudget.transactions.filter(t => t.type === 'fund_addition');
    const expenses = userBudget.transactions.filter(t => t.type !== 'fund_addition');
    
    // Calculate totals
    const totalFundsAdded = fundAdditions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const availableBudget = totalFundsAdded - totalExpenses;

    return {
      totalFundsAdded: parseFloat(totalFundsAdded.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      availableBudget: parseFloat(availableBudget.toFixed(2)),
      transactions: userBudget.transactions,
      transactionCount: userBudget.transactions.length,
      beneficiaries: userBudget.beneficiaries || [],
      itemDescriptions: userBudget.itemDescriptions || ['Sky Cap'],
      flightNumbers: userBudget.flightNumbers || ['AT200', 'AT201']
    };
  }

  /**
   * ATOMIC OPERATION: Add funds to user account
   */
  async addFunds(userId, amount, addedBy) {
    const releaseLock = await this.getUserLock(userId);
    
    try {
      const data = getData();
      
      // Ensure user data exists
      if (!data.userData[userId]) {
        data.userData[userId] = {
          transactions: [],
          beneficiaries: [],
          itemDescriptions: ['Sky Cap'],
          flightNumbers: ['AT200', 'AT201']
        };
      }

      const userBudget = data.userData[userId];
      
      // Create fund addition transaction
      const transaction = {
        id: `fund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'fund_addition',
        dateOfReimbursement: new Date().toISOString(),
        itemDescription: 'Fund Addition',
        amount: parseFloat(amount),
        addedBy: addedBy,
        timestamp: new Date().toISOString()
      };

      // Add transaction to the beginning of the array
      userBudget.transactions.unshift(transaction);
      
      // Remove the old budget field - we calculate it dynamically now
      delete userBudget.budget;
      
      await saveData();
      
      // Return complete budget state
      const budgetState = this.calculateUserBudgetState(userId);
      
      return {
        success: true,
        transaction,
        budgetState
      };
      
    } catch (error) {
      console.error('Add funds error:', error);
      return { success: false, error: error.message };
    } finally {
      releaseLock();
      this.releaseUserLock(userId);
    }
  }

  /**
   * ATOMIC OPERATION: Add expense transaction
   */
  async addTransaction(userId, transactionData, addedBy) {
    const releaseLock = await this.getUserLock(userId);
    
    try {
      const data = getData();
      
      // Ensure user data exists
      if (!data.userData[userId]) {
        data.userData[userId] = {
          transactions: [],
          beneficiaries: [],
          itemDescriptions: ['Sky Cap'],
          flightNumbers: ['AT200', 'AT201']
        };
      }

      const userBudget = data.userData[userId];
      
      // Create expense transaction
      const transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...transactionData,
        amount: parseFloat(transactionData.amount),
        addedBy: addedBy,
        timestamp: new Date().toISOString()
      };

      // Add transaction to the beginning
      userBudget.transactions.unshift(transaction);
      
      // Update autocomplete data
      if (transactionData.beneficiary) {
        const beneficiary = transactionData.beneficiary.trim();
        if (!userBudget.beneficiaries.includes(beneficiary)) {
          userBudget.beneficiaries.unshift(beneficiary);
          userBudget.beneficiaries = userBudget.beneficiaries.slice(0, 50);
        }
      }

      if (transactionData.itemDescription) {
        const item = transactionData.itemDescription.trim();
        if (!userBudget.itemDescriptions.includes(item)) {
          userBudget.itemDescriptions.unshift(item);
          userBudget.itemDescriptions = userBudget.itemDescriptions.slice(0, 50);
        }
      }

      if (transactionData.flightNumber) {
        const flight = transactionData.flightNumber.trim();
        if (!userBudget.flightNumbers.includes(flight)) {
          userBudget.flightNumbers.unshift(flight);
          userBudget.flightNumbers = userBudget.flightNumbers.slice(0, 50);
        }
      }

      // Remove old budget field
      delete userBudget.budget;
      
      await saveData();
      
      // Return complete budget state
      const budgetState = this.calculateUserBudgetState(userId);
      
      return {
        success: true,
        transaction,
        budgetState
      };
      
    } catch (error) {
      console.error('Add transaction error:', error);
      return { success: false, error: error.message };
    } finally {
      releaseLock();
      this.releaseUserLock(userId);
    }
  }

  /**
   * ATOMIC OPERATION: Edit existing transaction
   */
  async editTransaction(userId, transactionId, updates, modifiedBy) {
    const releaseLock = await this.getUserLock(userId);
    
    try {
      const data = getData();
      const userBudget = data.userData[userId];
      
      if (!userBudget) {
        return { success: false, error: 'User data not found' };
      }

      const transactionIndex = userBudget.transactions.findIndex(t => t.id === transactionId);
      if (transactionIndex === -1) {
        return { success: false, error: 'Transaction not found' };
      }

      const transaction = userBudget.transactions[transactionIndex];
      
      // Update transaction with new values
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined && updates[key] !== null) {
          if (key === 'amount') {
            transaction[key] = parseFloat(updates[key]);
          } else if (typeof updates[key] === 'string') {
            transaction[key] = updates[key].trim();
          } else {
            transaction[key] = updates[key];
          }
        }
      });

      // Add modification metadata
      transaction.lastModified = new Date().toISOString();
      transaction.modifiedBy = modifiedBy;

      // Remove old budget field
      delete userBudget.budget;
      
      await saveData();
      
      // Return complete budget state
      const budgetState = this.calculateUserBudgetState(userId);
      
      return {
        success: true,
        transaction,
        budgetState
      };
      
    } catch (error) {
      console.error('Edit transaction error:', error);
      return { success: false, error: error.message };
    } finally {
      releaseLock();
      this.releaseUserLock(userId);
    }
  }

  /**
   * ATOMIC OPERATION: Delete transaction
   */
  async deleteTransaction(userId, transactionId, deletedBy) {
    const releaseLock = await this.getUserLock(userId);
    
    try {
      const data = getData();
      const userBudget = data.userData[userId];
      
      if (!userBudget) {
        return { success: false, error: 'User data not found' };
      }

      const transactionIndex = userBudget.transactions.findIndex(t => t.id === transactionId);
      if (transactionIndex === -1) {
        return { success: false, error: 'Transaction not found' };
      }

      const transaction = userBudget.transactions[transactionIndex];
      
      // Remove the transaction
      userBudget.transactions.splice(transactionIndex, 1);

      // Remove old budget field
      delete userBudget.budget;
      
      await saveData();
      
      // Return complete budget state
      const budgetState = this.calculateUserBudgetState(userId);
      
      return {
        success: true,
        deletedTransaction: transaction,
        budgetState
      };
      
    } catch (error) {
      console.error('Delete transaction error:', error);
      return { success: false, error: error.message };
    } finally {
      releaseLock();
      this.releaseUserLock(userId);
    }
  }

  /**
   * ATOMIC OPERATION: Assign BD numbers to transactions
   */
  async assignBdNumbers(userId, transactionIds, bdNumber, assignedBy) {
    const releaseLock = await this.getUserLock(userId);
    
    try {
      const data = getData();
      const userBudget = data.userData[userId];
      
      if (!userBudget) {
        return { success: false, error: 'User data not found' };
      }

      let updatedCount = 0;
      const cleanBdNumber = bdNumber.trim();

      userBudget.transactions.forEach(transaction => {
        if (transactionIds.includes(transaction.id)) {
          transaction.bdNumber = cleanBdNumber;
          transaction.bdAssignedBy = assignedBy;
          transaction.bdAssignedAt = new Date().toISOString();
          updatedCount++;
        }
      });

      // Remove old budget field
      delete userBudget.budget;
      
      await saveData();
      
      // Return complete budget state
      const budgetState = this.calculateUserBudgetState(userId);
      
      return {
        success: true,
        bdNumber: cleanBdNumber,
        transactionIds,
        updatedCount,
        budgetState
      };
      
    } catch (error) {
      console.error('Assign BD numbers error:', error);
      return { success: false, error: error.message };
    } finally {
      releaseLock();
      this.releaseUserLock(userId);
    }
  }

  /**
   * Get current budget state (read-only, no locks needed)
   */
  getUserBudgetState(userId) {
    return this.calculateUserBudgetState(userId);
  }

  /**
   * Initialize user data if it doesn't exist
   */
  async initializeUserData(userId) {
    const data = getData();
    
    if (!data.userData[userId]) {
      data.userData[userId] = {
        transactions: [],
        beneficiaries: [],
        itemDescriptions: ['Sky Cap'],
        flightNumbers: ['AT200', 'AT201']
      };
      await saveData();
    }
    
    return this.calculateUserBudgetState(userId);
  }

  /**
   * Clean up old budget fields from all user data (migration helper)
   */
  async cleanupOldBudgetFields() {
    const data = getData();
    let needsSave = false;
    
    Object.values(data.userData).forEach(userBudget => {
      if (userBudget.budget !== undefined) {
        delete userBudget.budget;
        needsSave = true;
      }
    });
    
    if (needsSave) {
      await saveData();
      console.log(' Cleaned up old budget fields from user data');
    }
  }
}

// Create singleton instance
const budgetManager = new BudgetManager();

module.exports = budgetManager;