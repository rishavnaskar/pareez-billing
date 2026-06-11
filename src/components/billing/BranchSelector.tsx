'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getBranches } from '@/lib/db';
import { Branch } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface BranchSelectorProps {
    selectedBranchId: string | null;
    onBranchChange: (branchId: string) => void;
}

export function BranchSelector({ selectedBranchId, onBranchChange }: BranchSelectorProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Fetch the branch list once
    useEffect(() => {
        let active = true;
        getBranches()
            .then((data) => {
                if (active) setBranches(data);
            })
            .catch((error) => {
                console.error('Error fetching branches:', error);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    // Apply default selection: branch users are locked to their branch,
    // admins default to the first branch when nothing is selected yet
    useEffect(() => {
        if (loading) return;

        if (user?.role === 'user' && user.branchId) {
            if (selectedBranchId !== user.branchId) {
                onBranchChange(user.branchId);
            }
        } else if (!selectedBranchId && branches.length > 0) {
            onBranchChange(branches[0].id);
        }
    }, [loading, branches, user, selectedBranchId, onBranchChange]);

    if (loading) {
        return <div className="text-sm text-gray-500">Loading branches...</div>;
    }

    if (user?.role === 'user' && user.branchId) {
        const userBranch = branches.find(b => b.id === user.branchId);
        return (
            <div className="space-y-2">
                <Label>Branch</Label>
                <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
                    {userBranch?.name || 'Your Branch'}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <Label>Select Branch {user?.role === 'admin' && <span className="text-xs text-gray-500">(Admin)</span>}</Label>
            <Select value={selectedBranchId || undefined} onValueChange={onBranchChange}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                    {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
