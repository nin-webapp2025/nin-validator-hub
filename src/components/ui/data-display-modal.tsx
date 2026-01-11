import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataDisplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: any;
}

// Helper function to clean and format field names
const formatFieldName = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Helper function to format values
const formatValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Fields to exclude from display
const excludedFields = ['success', 'message', 'error', 'status', 'trackingId', 'photo', 'signature', 'Photo', 'Signature', 'photograph', 'Photograph'];

export function DataDisplayModal({ open, onOpenChange, title, data }: DataDisplayModalProps) {
  if (!data) return null;

  // Extract relevant data (remove wrapper objects and metadata)
  const relevantData = data.data || data;
  
  // Filter and organize fields
  const fields = Object.entries(relevantData)
    .filter(([key]) => !excludedFields.includes(key))
    .filter(([_, value]) => value !== null && value !== undefined && value !== '');

  // Split into two columns
  const midPoint = Math.ceil(fields.length / 2);
  const leftColumn = fields.slice(0, midPoint);
  const rightColumn = fields.slice(midPoint);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">{title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(85vh-120px)] pr-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {leftColumn.map(([key, value]) => (
                <div key={key} className="border-b border-slate-200 pb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    {formatFieldName(key)}
                  </p>
                  <p className="text-sm text-slate-900 break-words">
                    {formatValue(value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {rightColumn.map(([key, value]) => (
                <div key={key} className="border-b border-slate-200 pb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    {formatFieldName(key)}
                  </p>
                  <p className="text-sm text-slate-900 break-words">
                    {formatValue(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Badge */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {fields.length} fields displayed
            </Badge>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
