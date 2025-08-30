
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Calculator } from 'lucide-react';
import type { CreateBudgetItemInput, BudgetCategory } from '../../../server/src/schema';

interface BudgetItemFormProps {
  budgetItems: CreateBudgetItemInput[];
  onUpdateItems: (items: CreateBudgetItemInput[]) => void;
}

export function BudgetItemForm({ budgetItems, onUpdateItems }: BudgetItemFormProps) {
  const addBudgetItem = () => {
    const newItem: CreateBudgetItemInput = {
      budget_request_id: 0,
      category: 'operational' as BudgetCategory,
      description: '',
      unit: null,
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
      justification: null
    };
    onUpdateItems([...budgetItems, newItem]);
  };

  const updateBudgetItem = (index: number, field: keyof CreateBudgetItemInput, value: string | number | null) => {
    const updated = [...budgetItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate total cost
    if (field === 'quantity' || field === 'unit_cost') {
      const quantity = field === 'quantity' ? (typeof value === 'number' ? value : updated[index].quantity) : updated[index].quantity;
      const unitCost = field === 'unit_cost' ? (typeof value === 'number' ? value : updated[index].unit_cost) : updated[index].unit_cost;
      updated[index].total_cost = (quantity || 0) * (unitCost || 0);
    }
    
    onUpdateItems(updated);
  };

  const removeBudgetItem = (index: number) => {
    onUpdateItems(budgetItems.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryLabel = (category: BudgetCategory) => {
    const labels: Record<BudgetCategory, string> = {
      personnel: 'Personnel',
      goods_services: 'Goods & Services',
      capital_expenditure: 'Capital Expenditure',
      operational: 'Operational',
      maintenance: 'Maintenance',
      training: 'Training',
      travel: 'Travel',
      other: 'Other'
    };
    return labels[category];
  };

  const getCategoryColor = (category: BudgetCategory) => {
    const colors: Record<BudgetCategory, string> = {
      personnel: 'bg-blue-100 text-blue-800',
      goods_services: 'bg-green-100 text-green-800',
      capital_expenditure: 'bg-purple-100 text-purple-800',
      operational: 'bg-orange-100 text-orange-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      training: 'bg-pink-100 text-pink-800',
      travel: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category];
  };

  const totalBudget = budgetItems.reduce((sum: number, item: CreateBudgetItemInput) => sum + item.total_cost, 0);

  return (
    <Card className="card-animate">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Budget Breakdown</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Add detailed budget items for accurate cost estimation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(totalBudget)}
              </p>
            </div>
            <Button 
              type="button" 
              onClick={addBudgetItem} 
              variant="outline" 
              size="sm"
              className="btn-gov-primary text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {budgetItems.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Calculator className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Items</h3>
            <p className="text-gray-500 mb-4">
              Start adding budget items to create a detailed cost breakdown for your request.
            </p>
            <Button 
              type="button" 
              onClick={addBudgetItem} 
              className="btn-gov-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {budgetItems.map((item: CreateBudgetItemInput, index: number) => (
              <Card key={index} className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={getCategoryColor(item.category)}>
                        {getCategoryLabel(item.category)}
                      </Badge>
                      <span className="text-sm text-gray-500">Item #{index + 1}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBudgetItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* First row: Category, Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`category-${index}`} className="text-sm font-medium">
                        Category *
                      </Label>
                      <Select
                        value={item.category}
                        onValueChange={(value: BudgetCategory) => updateBudgetItem(index, 'category', value)}
                      >
                        <SelectTrigger id={`category-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personnel">👥 Personnel</SelectItem>
                          <SelectItem value="goods_services">📦 Goods & Services</SelectItem>
                          <SelectItem value="capital_expenditure">🏗️ Capital Expenditure</SelectItem>
                          <SelectItem value="operational">⚙️ Operational</SelectItem>
                          <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                          <SelectItem value="training">📚 Training</SelectItem>
                          <SelectItem value="travel">✈️ Travel</SelectItem>
                          <SelectItem value="other">📋 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`} className="text-sm font-medium">
                        Description *
                      </Label>
                      <Input
                        id={`description-${index}`}
                        value={item.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateBudgetItem(index, 'description', e.target.value)
                        }
                        placeholder="Detailed description of the item"
                        required
                      />
                    </div>
                  </div>

                  {/* Second row: Unit, Quantity, Unit Cost, Total */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`unit-${index}`} className="text-sm font-medium">
                        Unit
                      </Label>
                      <Input
                        id={`unit-${index}`}
                        value={item.unit || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateBudgetItem(index, 'unit', e.target.value || null)
                        }
                        placeholder="pcs, kg, hours"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`quantity-${index}`} className="text-sm font-medium">
                        Quantity
                      </Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateBudgetItem(index, 'quantity', parseInt(e.target.value) || null)
                        }
                        min="1"
                        placeholder="1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`unit-cost-${index}`} className="text-sm font-medium">
                        Unit Cost (IDR)
                      </Label>
                      <Input
                        id={`unit-cost-${index}`}
                        type="number"
                        value={item.unit_cost}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateBudgetItem(index, 'unit_cost', parseFloat(e.target.value) || 0)
                        }
                        step="1000"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Total Cost</Label>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          value={item.total_cost}
                          readOnly
                          className="bg-gray-50 font-mono"
                        />
                        <p className="text-xs font-semibold text-blue-600">
                          {formatCurrency(item.total_cost)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Third row: Justification */}
                  <div className="space-y-2">
                    <Label htmlFor={`justification-${index}`} className="text-sm font-medium">
                      Justification
                    </Label>
                    <Textarea
                      id={`justification-${index}`}
                      value={item.justification || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        updateBudgetItem(index, 'justification', e.target.value || null)
                      }
                      placeholder="Why is this item necessary? How does it contribute to the project goals?"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Summary */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      Budget Summary
                    </h3>
                    <p className="text-sm text-blue-700">
                      {budgetItems.length} item{budgetItems.length !== 1 ? 's' : ''} added
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900 currency-display">
                      {formatCurrency(totalBudget)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Total Budget Request
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}