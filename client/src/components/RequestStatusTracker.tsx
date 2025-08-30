import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle, XCircle, FileText, Eye } from 'lucide-react';
import type { BudgetRequest, BudgetRequestStatus } from '../../../server/src/schema';

interface RequestStatusTrackerProps {
  requests: BudgetRequest[];
}

export function RequestStatusTracker({ requests }: RequestStatusTrackerProps) {
  const getStatusIcon = (status: BudgetRequestStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      case 'under_review':
        return <Eye className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'revision_requested':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: BudgetRequestStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'revision_requested':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: BudgetRequestStatus) => {
    const labels: Record<BudgetRequestStatus, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      revision_requested: 'Revision Requested'
    };
    return labels[status];
  };

  const getStatusProgress = (status: BudgetRequestStatus) => {
    switch (status) {
      case 'draft':
        return 10;
      case 'submitted':
        return 30;
      case 'under_review':
        return 60;
      case 'approved':
        return 100;
      case 'rejected':
        return 100;
      case 'revision_requested':
        return 40;
      default:
        return 0;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusStats = () => {
    const stats = requests.reduce((acc: Record<string, number>, request: BudgetRequest) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {});
    
    return stats;
  };

  const statusStats = getStatusStats();
  const totalRequests = requests.length;
  const totalAmount = requests.reduce((sum: number, req: BudgetRequest) => sum + req.total_amount, 0);

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No budget requests to track</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Request Statistics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-2xl font-bold text-blue-600">{totalRequests}</p>
              <p className="text-sm text-blue-700">Total Requests</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-600">{statusStats.approved || 0}</p>
              <p className="text-sm text-green-700">Approved</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-600">{(statusStats.submitted || 0) + (statusStats.under_review || 0)}</p>
              <p className="text-sm text-yellow-700">Pending</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-lg font-bold text-purple-600">{formatCurrency(totalAmount)}</p>
              <p className="text-sm text-purple-700">Total Amount</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Request Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Request Status Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request: BudgetRequest) => (
              <Card key={request.id} className="border border-gray-200">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{request.request_title}</h3>
                        <Badge className={`${getStatusColor(request.status)} border`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(request.status)}
                            <span>{getStatusLabel(request.status)}</span>
                          </div>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{request.department_name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>FY {request.fiscal_year}</span>
                        <span>•</span>
                        <span>{formatCurrency(request.total_amount)}</span>
                        <span>•</span>
                        <span>Created {request.created_at.toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{getStatusProgress(request.status)}%</span>
                    </div>
                    <Progress 
                      value={getStatusProgress(request.status)} 
                      className="h-2"
                    />
                    <div className="grid grid-cols-6 gap-2 text-xs text-gray-500 mt-2">
                      <div className={`text-center ${request.status === 'draft' ? 'font-semibold text-gray-700' : ''}`}>
                        Draft
                      </div>
                      <div className={`text-center ${request.status === 'submitted' ? 'font-semibold text-blue-700' : ''}`}>
                        Submitted
                      </div>
                      <div className={`text-center ${request.status === 'under_review' ? 'font-semibold text-yellow-700' : ''}`}>
                        Review
                      </div>
                      <div className={`text-center ${request.status === 'revision_requested' ? 'font-semibold text-orange-700' : ''}`}>
                        Revision
                      </div>
                      <div className={`text-center ${request.status === 'approved' ? 'font-semibold text-green-700' : ''}`}>
                        Approved
                      </div>
                      <div className={`text-center ${request.status === 'rejected' ? 'font-semibold text-red-700' : ''}`}>
                        Final
                      </div>
                    </div>
                  </div>

                  {/* Timeline Information */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Created:</span>
                        <p className="text-gray-900">{request.created_at.toLocaleDateString('id-ID')}</p>
                      </div>
                      {request.submitted_at && (
                        <div>
                          <span className="font-medium text-gray-600">Submitted:</span>
                          <p className="text-gray-900">{request.submitted_at.toLocaleDateString('id-ID')}</p>
                        </div>
                      )}
                      {request.reviewed_at && (
                        <div>
                          <span className="font-medium text-gray-600">Reviewed:</span>
                          <p className="text-gray-900">{request.reviewed_at.toLocaleDateString('id-ID')}</p>
                        </div>
                      )}
                    </div>
                    
                    {request.reviewer_notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <span className="font-medium text-gray-600 text-sm">Reviewer Notes:</span>
                        <p className="text-gray-900 text-sm mt-1">{request.reviewer_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}