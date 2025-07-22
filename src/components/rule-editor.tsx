
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2, PlusCircle } from 'lucide-react';

export type Rule = {
  type: 'like' | 'subscribe' | 'follow' | 'visit';
  url: string;
};

const RULE_TYPES = {
  like: 'Like & Comment on Video',
  subscribe: 'Subscribe to a channel',
  follow: 'Follow on Instagram',
  visit: 'Visit a website',
};

type RuleEditorProps = {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
};

export function RuleEditor({ rules, onRulesChange }: RuleEditorProps) {
  const [newRuleType, setNewRuleType] = useState<'like' | 'subscribe' | 'follow' | 'visit'>('like');
  const [newRuleUrl, setNewRuleUrl] = useState('');

  const handleAddRule = () => {
    if (newRuleUrl.trim() !== '') {
      onRulesChange([...rules, { type: newRuleType, url: newRuleUrl.trim() }]);
      setNewRuleUrl('');
      setNewRuleType('like'); // Reset to default
    }
  };

  const handleRemoveRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (index: number, field: 'type' | 'url', value: string) => {
    const updatedRules = [...rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    onRulesChange(updatedRules);
  };


  return (
    <div className="space-y-4 rounded-md border p-4">
      {rules.map((rule, index) => (
        <div key={index} className="flex items-center gap-2">
           <Select value={rule.type} onValueChange={(value: any) => handleUpdateRule(index, 'type', value)}>
              <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select a rule" />
              </SelectTrigger>
              <SelectContent>
                  {Object.entries(RULE_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
              </SelectContent>
           </Select>
          <Input
            placeholder="https://..."
            value={rule.url}
            onChange={(e) => handleUpdateRule(index, 'url', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveRule(index)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-4 border-t">
        <Select value={newRuleType} onValueChange={(value: any) => setNewRuleType(value)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select a rule" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RULE_TYPES).map(([key, value]) => (
              <SelectItem key={key} value={key}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Enter URL for the rule"
          value={newRuleUrl}
          onChange={(e) => setNewRuleUrl(e.target.value)}
        />
        <Button type="button" variant="outline" size="icon" onClick={handleAddRule}>
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
