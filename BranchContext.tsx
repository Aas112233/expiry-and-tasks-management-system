import React, { createContext, useContext, useState, ReactNode } from 'react';
import { BRANCHES as INITIAL_BRANCHES } from './constants';
import { Branch } from './types';

interface BranchContextType {
  selectedBranch: string;
  setSelectedBranch: (branchName: string) => void;
  branches: Branch[];
  addBranch: (branch: Branch) => void;
  updateBranch: (id: string, branch: Branch) => void;
  deleteBranch: (id: string) => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);

  const addBranch = (branch: Branch) => {
    setBranches(prev => [...prev, branch]);
  };

  const updateBranch = (id: string, updatedBranch: Branch) => {
    setBranches(prev => prev.map(b => b.id === id ? updatedBranch : b));
    
    // If the currently selected branch name changed, update the selection
    const oldBranch = branches.find(b => b.id === id);
    if (oldBranch && oldBranch.name === selectedBranch && oldBranch.name !== updatedBranch.name) {
        setSelectedBranch(updatedBranch.name);
    }
  };

  const deleteBranch = (id: string) => {
    const branchToDelete = branches.find(b => b.id === id);
    setBranches(prev => prev.filter(b => b.id !== id));
    
    // If deleted branch was selected, reset to All
    if (branchToDelete && selectedBranch === branchToDelete.name) {
        setSelectedBranch('All Branches');
    }
  };

  return (
    <BranchContext.Provider value={{ 
        selectedBranch, 
        setSelectedBranch, 
        branches, 
        addBranch, 
        updateBranch, 
        deleteBranch 
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