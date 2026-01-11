import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Download,
  AlertCircle
} from "lucide-react";
import { exportToCSV } from "@/lib/export";

interface BatchResult {
  nin: string;
  status: "success" | "failed";
  result?: any;
  error?: string;
}

export function BatchValidation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [totalNins, setTotalNins] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setResults([]);
      setProgress(0);
    }
  };

  const parseCSV = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const nins: string[] = [];
        
        // Skip header row if it exists
        const startIndex = lines[0].toLowerCase().includes('nin') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            // Extract NIN from first column
            const nin = line.split(',')[0].trim().replace(/['"]/g, '');
            if (nin && /^\d{11}$/.test(nin)) {
              nins.push(nin);
            }
          }
        }
        resolve(nins);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const validateNIN = async (nin: string): Promise<BatchResult> => {
    try {
      const { data, error } = await supabase.functions.invoke("robosttech-api", {
        body: {
          action: "validate",
          nin: nin,
        },
      });

      if (error) throw error;

      // Save to history
      if (user) {
        await supabase.from("validation_history").insert({
          user_id: user.id,
          nin: nin,
          status: data.success ? "success" : "failed",
          result: data,
          tracking_id: data.tracking_id || null,
        });
      }

      return {
        nin,
        status: data.success ? "success" : "failed",
        result: data,
      };
    } catch (error) {
      return {
        nin,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  const processBatch = async () => {
    if (!file || !user) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const nins = await parseCSV(file);
      setTotalNins(nins.length);

      if (nins.length === 0) {
        toast({
          title: "No valid NINs found",
          description: "The CSV file contains no valid 11-digit NINs",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      if (nins.length > 100) {
        toast({
          title: "Batch too large",
          description: "Maximum 100 NINs per batch. Please split your file.",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      const batchResults: BatchResult[] = [];

      // Process in chunks of 5 to avoid rate limiting
      const chunkSize = 5;
      for (let i = 0; i < nins.length; i += chunkSize) {
        const chunk = nins.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(nin => validateNIN(nin));
        const chunkResults = await Promise.all(chunkPromises);
        
        batchResults.push(...chunkResults);
        setResults([...batchResults]);
        setProgress(Math.round((batchResults.length / nins.length) * 100));

        // Small delay between chunks
        if (i + chunkSize < nins.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successCount = batchResults.filter(r => r.status === "success").length;
      toast({
        title: "Batch processing complete",
        description: `${successCount} of ${nins.length} validations successful`,
      });

    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadResults = () => {
    const exportData = results.map(r => ({
      NIN: r.nin,
      Status: r.status,
      Message: r.result?.message || r.error || "",
      FirstName: r.result?.data?.firstname || "",
      LastName: r.result?.data?.surname || "",
      DateOfBirth: r.result?.data?.birthdate || "",
      Phone: r.result?.data?.telephoneno || "",
    }));

    exportToCSV(exportData, "batch-validation-results");
    toast({
      title: "Results exported",
      description: "Batch validation results downloaded as CSV",
    });
  };

  const successCount = results.filter(r => r.status === "success").length;
  const failedCount = results.filter(r => r.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            <span className="text-base sm:text-xl">Batch NIN Validation</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Upload a CSV file with NINs for bulk validation (max 100 NINs)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 sm:p-8 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer bg-slate-50 dark:bg-slate-900/50"
            >
              <Upload className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-slate-400" />
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {file ? file.name : "Click to upload CSV file"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CSV format: NIN in first column
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* CSV Format Example */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    CSV Format Example:
                  </p>
                  <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded border border-blue-200 dark:border-blue-800 font-mono">
{`NIN
12345678901
98765432109
11122233344`}
                  </pre>
                </div>
              </div>
            </div>

            <Button
              onClick={processBatch}
              disabled={!file || processing}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing... {progress}%
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Process Batch
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          {processing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-3" />
              <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                Processing {results.length} of {totalNins} NINs...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      {results.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700 shadow-lg dark:bg-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Batch Results</CardTitle>
              <Button onClick={downloadResults} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export Results
              </Button>
            </div>
            <div className="flex gap-3 mt-4">
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4" />
                {successCount} Successful
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">
                <XCircle className="h-4 w-4" />
                {failedCount} Failed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="flex items-center gap-3">
                    {result.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {result.nin}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {result.result?.data?.firstname} {result.result?.data?.surname || result.error}
                      </p>
                    </div>
                  </div>
                  <Badge variant={result.status === "success" ? "default" : "destructive"}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
