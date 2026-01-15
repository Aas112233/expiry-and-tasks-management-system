import React, { useState } from 'react';
import { FileText, Download, Filter, Calendar, CheckSquare, AlertTriangle, Layers } from 'lucide-react';
import { MOCK_EXPIRED_ITEMS, MOCK_TASKS } from '../constants';
import { useBranch } from '../BranchContext';

type ReportType = 'expiry' | 'tasks' | 'inventory';

/* 
   --- BACKEND INTEGRATION NOTES ---
   
   REPORT GENERATION STRATEGY:
   Currently, the reports are generated client-side from mock data.
   In production, report generation (especially for large datasets) should happen on the server.
   
   ENDPOINT: GET /api/reports/export
   PARAMS: 
     - type: 'expiry' | 'tasks' | 'inventory'
     - branch_id: string
     - start_date: ISO Date
     - end_date: ISO Date
     - format: 'csv' | 'xlsx'
     
   BEHAVIOR:
   The server should stream a file response with the correct Content-Type (text/csv or application/vnd.ms-excel).
*/

export default function Reports() {
  const { branches } = useBranch();
  const [selectedReport, setSelectedReport] = useState<ReportType>('expiry');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Mock Generation Logic
  const generateData = () => {
    if (selectedReport === 'expiry') {
      let data = MOCK_EXPIRED_ITEMS;
      if (selectedBranch !== 'All') {
        data = data.filter(item => item.branch === selectedBranch);
      }
      return data.map(item => ({
        Product: item.productName,
        Barcode: item.barcode,
        Branch: item.branch,
        'Remaining Qty': item.remainingQty,
        'Expiry Date': item.expDate,
        Status: item.status
      }));
    } else if (selectedReport === 'tasks') {
      let data = MOCK_TASKS;
      if (selectedBranch !== 'All') {
        data = data.filter(t => t.branch === selectedBranch);
      }
      return data.map(t => ({
        Task: t.title,
        'Assigned To': t.assignedTo,
        Branch: t.branch,
        Priority: t.priority,
        'Due Date': t.dueDate,
        Status: t.status
      }));
    } else {
        // Inventory Report (Mocked based on expiry items)
        let data = MOCK_EXPIRED_ITEMS;
        if (selectedBranch !== 'All') {
          data = data.filter(item => item.branch === selectedBranch);
        }
        return data.map(item => ({
          SKU: item.barcode,
          'Product Name': item.productName,
          Branch: item.branch,
          'Current Stock': item.remainingQty + 50, // Mock calculation
          'Unit': item.unitName,
          'Last Audit': '2023-11-01'
        }));
    }
  };

  const previewData = generateData();

  const handleDownload = () => {
    // API NOTE: Replace this client-side generation with:
    // window.open(`/api/reports/export?type=${selectedReport}&branch=${selectedBranch}&format=csv`, '_blank');
    
    const data = generateData();
    if (data.length === 0) {
        alert("No data to export");
        return;
    }
    
    // Convert JSON to CSV
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header as keyof typeof row]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
            <p className="text-sm text-gray-500 mt-1">Generate and download detailed reports for analysis.</p>
        </div>
      </div>

      {/* Report Types Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
            onClick={() => setSelectedReport('expiry')}
            className={`p-6 rounded-xl border cursor-pointer transition-all ${selectedReport === 'expiry' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' : 'bg-white border-gray-100 hover:shadow-md'}`}
        >
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Expiry Risk Report</h3>
            <p className="text-sm text-gray-500 mt-1">Detailed list of expired and expiring items by branch.</p>
        </div>

        <div 
            onClick={() => setSelectedReport('tasks')}
            className={`p-6 rounded-xl border cursor-pointer transition-all ${selectedReport === 'tasks' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' : 'bg-white border-gray-100 hover:shadow-md'}`}
        >
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mb-4">
                <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Task Performance</h3>
            <p className="text-sm text-gray-500 mt-1">Task completion rates, overdue items, and employee workload.</p>
        </div>

        <div 
            onClick={() => setSelectedReport('inventory')}
            className={`p-6 rounded-xl border cursor-pointer transition-all ${selectedReport === 'inventory' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' : 'bg-white border-gray-100 hover:shadow-md'}`}
        >
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900">Inventory Status</h3>
            <p className="text-sm text-gray-500 mt-1">Current stock levels, valuation, and distribution summary.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
          {/* Configuration Panel */}
          <div className="w-full lg:w-1/3 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                      <Filter className="w-4 h-4 mr-2 text-gray-400" />
                      Configuration
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                          <select 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                            value={selectedBranch}
                            onChange={e => setSelectedBranch(e.target.value)}
                          >
                            <option>All</option>
                            {branches.map(b => <option key={b.id}>{b.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="relative">
                                 <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                             </div>
                             <div className="relative">
                                 <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                             </div>
                          </div>
                      </div>
                      <div className="pt-4">
                          <button 
                            onClick={handleDownload}
                            className="w-full flex items-center justify-center px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-medium transition-colors"
                          >
                              <Download className="w-4 h-4 mr-2" />
                              Download Excel (CSV)
                          </button>
                      </div>
                  </div>
              </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Data Preview</h3>
                      <span className="text-xs text-gray-500">{previewData.length} records found</span>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                              <tr>
                                  {previewData.length > 0 && Object.keys(previewData[0]).map(key => (
                                      <th key={key} className="px-6 py-3 font-semibold whitespace-nowrap">{key}</th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                              {previewData.length === 0 ? (
                                  <tr>
                                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                          No data matches your filters.
                                      </td>
                                  </tr>
                              ) : (
                                  previewData.slice(0, 8).map((row, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                          {Object.values(row).map((val, i) => (
                                              <td key={i} className="px-6 py-3 whitespace-nowrap text-gray-600">
                                                  {String(val)}
                                              </td>
                                          ))}
                                      </tr>
                                  ))
                              )}
                              {previewData.length > 8 && (
                                  <tr>
                                      <td colSpan={Object.keys(previewData[0]).length} className="px-6 py-3 text-center text-xs text-gray-400 bg-gray-50/50">
                                          ... and {previewData.length - 8} more rows
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}