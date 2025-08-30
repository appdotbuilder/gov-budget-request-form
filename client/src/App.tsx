import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react';
import { BudgetItemForm } from '@/components/BudgetItemForm';
import { RequestStatusTracker } from '@/components/RequestStatusTracker';
import { FileUploadSection } from '@/components/FileUploadSection';
import { DashboardSummary } from '@/components/DashboardSummary';
import type { 
  CreateBudgetRequestInput, 
  BudgetRequest, 
  BudgetRequestStatus, 
  PriorityLevel,
  CreateBudgetItemInput
} from '../../server/src/schema';

// Custom styling for professional government appearance
const govColors = {
  primary: 'bg-blue-900 hover:bg-blue-800 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
  success: 'bg-green-700 hover:bg-green-600 text-white',
  warning: 'bg-amber-600 hover:bg-amber-500 text-white',
  danger: 'bg-red-700 hover:bg-red-600 text-white'
};

function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [budgetItems, setBudgetItems] = useState<CreateBudgetItemInput[]>([]);

  // Form state for budget request
  const [formData, setFormData] = useState<CreateBudgetRequestInput>({
    department_name: '',
    department_code: null,
    contact_person: '',
    contact_email: '',
    contact_phone: null,
    fiscal_year: new Date().getFullYear() + 1,
    request_title: '',
    request_description: '',
    total_amount: 0,
    priority_level: 'medium' as PriorityLevel,
    justification: '',
    expected_outcomes: '',
    timeline_start: null,
    timeline_end: null,
    status: 'draft' as BudgetRequestStatus
  });

  // Load existing budget requests
  const loadBudgetRequests = useCallback(async () => {
    try {
      const result = await trpc.getBudgetRequests.query({
        limit: 10,
        offset: 0
      });
      setBudgetRequests(result.data);
    } catch (error) {
      console.error('Failed to load budget requests:', error);
    }
  }, []);

  useEffect(() => {
    loadBudgetRequests();
  }, [loadBudgetRequests]);

  // Calculate total from budget items
  useEffect(() => {
    const total = budgetItems.reduce((sum: number, item: CreateBudgetItemInput) => sum + item.total_cost, 0);
    setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, total_amount: total }));
  }, [budgetItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitSuccess(false);

    try {
      const response = await trpc.createBudgetRequest.mutate(formData);
      setBudgetRequests((prev: BudgetRequest[]) => [response, ...prev]);
      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        department_name: '',
        department_code: null,
        contact_person: '',
        contact_email: '',
        contact_phone: null,
        fiscal_year: new Date().getFullYear() + 1,
        request_title: '',
        request_description: '',
        total_amount: 0,
        priority_level: 'medium' as PriorityLevel,
        justification: '',
        expected_outcomes: '',
        timeline_start: null,
        timeline_end: null,
        status: 'draft' as BudgetRequestStatus
      });
      setBudgetItems([]);
      
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (error) {
      console.error('Failed to create budget request:', error);
    } finally {
      setIsLoading(false);
    }
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: BudgetRequestStatus) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, label: 'Draft', className: '' },
      submitted: { variant: 'default' as const, label: 'Submitted', className: '' },
      under_review: { variant: 'default' as const, label: 'Under Review', className: '' },
      approved: { variant: 'default' as const, label: 'Approved', className: 'bg-green-100 text-green-800' },
      rejected: { variant: 'destructive' as const, label: 'Rejected', className: '' },
      revision_requested: { variant: 'default' as const, label: 'Revision Requested', className: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    const priorityConfig = {
      critical: { className: 'bg-red-100 text-red-800', label: 'Critical' },
      high: { className: 'bg-orange-100 text-orange-800', label: 'High' },
      medium: { className: 'bg-blue-100 text-blue-800', label: 'Medium' },
      low: { className: 'bg-gray-100 text-gray-800', label: 'Low' }
    };
    
    const config = priorityConfig[priority];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Sistem Pengajuan Anggaran</h1>
              <p className="text-blue-200 text-sm">Government Budget Request System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Success Alert */}
      {submitSuccess && (
        <div className="container mx-auto px-4 pt-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Budget request has been successfully submitted! ✅
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-600px">
            <TabsTrigger value="form" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>New Request</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>View Requests</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Status Tracker</span>
            </TabsTrigger>
          </TabsList>

          {/* New Request Form */}
          <TabsContent value="form">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Request Information</span>
                  </CardTitle>
                  <CardDescription>
                    Please provide complete information for your budget request
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Department Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department_name">Department Name *</Label>
                      <Input
                        id="department_name"
                        value={formData.department_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, department_name: e.target.value }))
                        }
                        placeholder="e.g., Kementerian Keuangan"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department_code">Department Code</Label>
                      <Input
                        id="department_code"
                        value={formData.department_code || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, department_code: e.target.value || null }))
                        }
                        placeholder="e.g., KEMENKEU"
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Contact Person *</Label>
                      <Input
                        id="contact_person"
                        value={formData.contact_person}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, contact_person: e.target.value }))
                        }
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email *</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={formData.contact_email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, contact_email: e.target.value }))
                        }
                        placeholder="email@domain.gov.id"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Phone</Label>
                      <Input
                        id="contact_phone"
                        value={formData.contact_phone || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, contact_phone: e.target.value || null }))
                        }
                        placeholder="+62..."
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Request Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fiscal_year">Fiscal Year *</Label>
                      <Input
                        id="fiscal_year"
                        type="number"
                        value={formData.fiscal_year}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, fiscal_year: parseInt(e.target.value) || 2024 }))
                        }
                        min="2020"
                        max="2050"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority_level">Priority Level *</Label>
                      <Select
                        value={formData.priority_level}
                        onValueChange={(value: PriorityLevel) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, priority_level: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_amount">Total Amount</Label>
                      <Input
                        id="total_amount"
                        type="number"
                        value={formData.total_amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="IDR"
                        step="1000"
                        min="0"
                        readOnly
                        className="bg-gray-50"
                      />
                      <p className="text-sm text-gray-600">
                        {formatCurrency(formData.total_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="request_title">Request Title *</Label>
                    <Input
                      id="request_title"
                      value={formData.request_title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, request_title: e.target.value }))
                      }
                      placeholder="Brief title describing the budget request"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="request_description">Description *</Label>
                    <Textarea
                      id="request_description"
                      value={formData.request_description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, request_description: e.target.value }))
                      }
                      placeholder="Detailed description of the budget request..."
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="justification">Justification *</Label>
                      <Textarea
                        id="justification"
                        value={formData.justification}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, justification: e.target.value }))
                        }
                        placeholder="Why is this budget necessary?"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expected_outcomes">Expected Outcomes *</Label>
                      <Textarea
                        id="expected_outcomes"
                        value={formData.expected_outcomes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setFormData((prev: CreateBudgetRequestInput) => ({ ...prev, expected_outcomes: e.target.value }))
                        }
                        placeholder="What results do you expect?"
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget Items */}
              <BudgetItemForm 
                budgetItems={budgetItems}
                onUpdateItems={setBudgetItems}
              />

              {/* File Upload Section */}
              <FileUploadSection 
                maxFiles={5}
                maxFileSize={25}
              />

              {/* Submit Button */}
              <Card>
                <CardFooter className="pt-6">
                  <div className="flex space-x-4 w-full">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className={govColors.primary}
                      size="lg"
                    >
                      {isLoading ? 'Submitting...' : 'Submit Budget Request'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          department_name: '',
                          department_code: null,
                          contact_person: '',
                          contact_email: '',
                          contact_phone: null,
                          fiscal_year: new Date().getFullYear() + 1,
                          request_title: '',
                          request_description: '',
                          total_amount: 0,
                          priority_level: 'medium' as PriorityLevel,
                          justification: '',
                          expected_outcomes: '',
                          timeline_start: null,
                          timeline_end: null,
                          status: 'draft' as BudgetRequestStatus
                        });
                        setBudgetItems([]);
                      }}
                    >
                      Reset Form
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </form>
          </TabsContent>

          {/* Requests List */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Budget Requests</CardTitle>
                <CardDescription>
                  View and manage your submitted budget requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {budgetRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No budget requests found</p>
                    <p className="text-sm">Submit your first budget request to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {budgetRequests.map((request: BudgetRequest) => (
                      <Card key={request.id} className="border border-gray-200">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{request.request_title}</h3>
                              <p className="text-gray-600">{request.department_name}</p>
                            </div>
                            <div className="flex space-x-2">
                              {getStatusBadge(request.status)}
                              {getPriorityBadge(request.priority_level)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Fiscal Year:</span> {request.fiscal_year}
                            </div>
                            <div>
                              <span className="font-medium">Total Amount:</span> {formatCurrency(request.total_amount)}
                            </div>
                            <div>
                              <span className="font-medium">Created:</span> {request.created_at.toLocaleDateString('id-ID')}
                            </div>
                          </div>
                          
                          <p className="mt-3 text-gray-700">{request.request_description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status Tracker */}
          <TabsContent value="status">
            <div className="space-y-8">
              <DashboardSummary requests={budgetRequests} />
              <RequestStatusTracker requests={budgetRequests} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;