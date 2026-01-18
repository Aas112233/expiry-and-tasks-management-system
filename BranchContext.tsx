import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Branch, Role } from './types';
import { branchService } from './services/branchService';
import { useAuth } from './AuthContext';

interface BranchContextType {
  selectedBranch: string;
  setSelectedBranch: (branchName: string) => void;
  branches: Branch[];
  addBranch: (branch: Branch) => Promise<void>;
  updateBranch: (id: string, branch: Branch) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  syncBranches: () => Promise<any>;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [selectedBranch, setSelectedBranchInternal] = useState('All Branches');
  const [branches, setBranches] = useState<Branch[]>([]);

  // Update selected branch when user logs in
  useEffect(() => {
    if (user && user.role !== Role.Admin) {
      setSelectedBranchInternal(user.branchId);
    } else if (!user) {
      setSelectedBranchInternal('All Branches');
    }
  }, [user]);

  useEffect(() => {
    refreshBranches();
  }, [user]);

  const refreshBranches = async () => {
    try {
      const data = await branchService.getAllBranches();

      // Filter branches for non-admins
      if (user && user.role !== Role.Admin) {
        const userBranch = data.filter(b => b.name === user.branchId);
        setBranches(userBranch);
      } else {
        setBranches(data);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const setSelectedBranch = (branchName: string) => {
    // Prevent non-admins from changing branch
    if (user && user.role !== Role.Admin) {
      return;
    }
    setSelectedBranchInternal(branchName);
  };

  const addBranch = async (branch: Branch) => {
    try {
      const newBranch = await branchService.createBranch(branch);
      setBranches(prev => [...prev, newBranch]);
    } catch (error) {
      console.error('Failed to add branch:', error);
      throw error;
    }
  };

  const updateBranch = async (id: string, updatedBranch: Branch) => {
    try {
      const result = await branchService.updateBranch(id, updatedBranch);
      setBranches(prev => prev.map(b => b.id === id ? result : b));

      const oldBranch = branches.find(b => b.id === id);
      if (oldBranch && oldBranch.name === selectedBranch && oldBranch.name !== result.name) {
        setSelectedBranch(result.name);
      }
    } catch (error) {
      console.error('Failed to update branch:', error);
      throw error;
    }
  };

  const deleteBranch = async (id: string) => {
    try {
      await branchService.deleteBranch(id);
      const branchToDelete = branches.find(b => b.id === id);
      setBranches(prev => prev.filter(b => b.id !== id));

      if (branchToDelete && selectedBranch === branchToDelete.name) {
        setSelectedBranch('All Branches');
      }
    } catch (error) {
      console.error('Failed to delete branch:', error);
      throw error;
    }
  };

  const syncBranches = async () => {
    try {
      const result = await branchService.syncBranches();
      if (result.created > 0) {
        await refreshBranches();
      }
      return result;
    } catch (error) {
      console.error("Failed to sync branches", error);
      throw error;
    }
  };

  return (
    <BranchContext.Provider value={{
      selectedBranch,
      setSelectedBranch,
      branches,
      addBranch,
      updateBranch,
      deleteBranch,
      syncBranches,
      refreshBranches
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};