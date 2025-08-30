import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle, 
  Calendar
} from 'lucide-react';
import type { BudgetRequest } from '../../../server/src/schema';

interface DashboardSummaryProps {
  requests: BudgetRequest[];
}

export function DashboardSummary({ requests }: DashboardSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(amount);
  };

  // Calculate statistics
  const totalRequests = requests.length;
  const totalAmount = requests.reduce((sum: number, req: BudgetRequest) => sum + req.total_amount, 0);
  
  const statusCounts = requests.reduce((acc: Record<string, number>, req: BudgetRequest) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {});

  const approvedCount = statusCounts.approved || 0;
  const pendingCount = (statusCounts.submitted || 0) + (statusCounts.under_review || 0);
  const rejectedCount = statusCounts.rejected || 0;
  const draftCount = statusCounts.draft || 0;

  const approvalRate = totalRequests > 0 ? (approvedCount / totalRequests) * 100 : 0;
  
  const approvedAmount = requests
    .filter((req: BudgetRequest) => req.status === 'approved')
    .reduce((sum: number, req: BudgetRequest) => sum + req.total_amount, 0);

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentRequests = requests.filter((req: BudgetRequest) => 
    req.created_at >= thirtyDaysAgo
  ).length;

  const currentYear = new Date().getFullYear();
  const currentFiscalYear = requests.filter((req: BudgetRequest) => 
    req.fiscal_year === currentYear
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Requests</p>
                <p className="text-3xl font-bold text-blue-900">{totalRequests}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {recentRequests} in last 30 days
                </p>
              </div>
              <div className="bg-blue-500 p-3 rounded-full">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Total Budget</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-green-600 mt-1">
                  {formatCurrency(approvedAmount)} approved
                </p>
              </div>
              <div className="bg-green-500 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
                <p className="text-xs text-yellow-600 mt-1">
                  Awaiting decision
                </p>
              </div>
              <div className="bg-yellow-500 p-3 rounded-full">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Approval Rate</p>
                <p className="text-3xl font-bold text-purple-900">{approvalRate.toFixed(0)}%</p>
                <p className="text-xs text-purple-600 mt-1">
                  {approvedCount} approved
                </p>
              </div>
              <div className="bg-purple-500 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Request Status Breakdown</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Draft */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium">Draft</span>
                </div>
                <Badge variant="secondary">{draftCount}</Badge>
              </div>
              
              {/* Pending */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm font-medium">Pending Review</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">{pendingCount}</Badge>
              </div>
              
              {/* Approved */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Approved</span>
                </div>
                <Badge className="bg-green-100 text-green-800">{approvedCount}</Badge>
              </div>
              
              {/* Rejected */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium">Rejected</span>
                </div>
                <Badge className="bg-red-100 text-red-800">{rejectedCount}</Badge>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{approvalRate.toFixed(1)}%</span>
              </div>
              <Progress value={approvalRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Fiscal Year {currentYear} Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{currentFiscalYear.length}</p>
                  <p className="text-sm text-blue-700">Requests</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(
                      currentFiscalYear.reduce((sum: number, req: BudgetRequest) => sum + req.total_amount, 0)
                    )}
                  </p>
                  <p className="text-sm text-green-700">Budget</p>
                </div>
              </div>
              
              {/* Recent Activity */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h4>
                {requests.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent activity</p>
                ) : (
                  <div className="space-y-2">
                    {requests.slice(0, 3).map((request: BudgetRequest) => (
                      <div key={request.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {request.request_title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {request.created_at.toLocaleDateString('id-ID')}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            request.status === 'approved' ? 'border-green-200 text-green-700' :
                            request.status === 'rejected' ? 'border-red-200 text-red-700' :
                            'border-yellow-200 text-yellow-700'
                          }
                        >
                          {request.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}