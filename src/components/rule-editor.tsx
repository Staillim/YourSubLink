
'use client';

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
  type: 'like' | 'comment' | 'subscribe' | 'follow' | 'visit';
  url: string;
};

const RULE_TYPES = {
  like: 'Like a Video',
  comment: 'Comment on a Video',
  subscribe: 'Subscribe to a channel',
  follow: 'Follow on Social Media',
  visit: 'Visit a website',
};

type RuleEditorProps = {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
};

export function RuleEditor({ rules, onRulesChange }: RuleEditorProps) {

  const handleAddRule = () => {
    onRulesChange([...rules, { type: 'like', url: '' }]);
  };

  const handleRemoveRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (index: number, field: 'type' | 'url', value: string) => {
    const updatedRules = [...rules];
    // Create a new object for the rule to ensure state update
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    onRulesChange(updatedRules);
  };


  return (
    <div className="space-y-4 rounded-md border p-4">
        {rules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No rules added yet.</p>
        )}
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

      <div className="pt-4 border-t">
        <Button type="button" variant="outline" className="w-full" onClick={handleAddRule}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>
    </div>
  );
}
