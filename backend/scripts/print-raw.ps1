# Envia bytes RAW (ESC/POS) direto ao spooler do Windows pelo nome da
# impressora instalada — não exige que ela esteja compartilhada.
param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$FilePath
)
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static void Send(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
      throw new Exception("Impressora '" + printerName + "' nao encontrada no Windows (erro " + Marshal.GetLastWin32Error() + ")");
    try {
      DOCINFOA di = new DOCINFOA();
      di.pDocName = "Cupom PDV";
      di.pDataType = "RAW";
      if (!StartDocPrinter(hPrinter, 1, di))
        throw new Exception("StartDocPrinter falhou (erro " + Marshal.GetLastWin32Error() + ")");
      try {
        StartPagePrinter(hPrinter);
        IntPtr buf = Marshal.AllocHGlobal(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, buf, bytes.Length);
          int written;
          if (!WritePrinter(hPrinter, buf, bytes.Length, out written))
            throw new Exception("WritePrinter falhou (erro " + Marshal.GetLastWin32Error() + ")");
        } finally { Marshal.FreeHGlobal(buf); }
        EndPagePrinter(hPrinter);
      } finally { EndDocPrinter(hPrinter); }
    } finally { ClosePrinter(hPrinter); }
  }
}
"@

$bytes = [System.IO.File]::ReadAllBytes($FilePath)
[RawPrinter]::Send($PrinterName, $bytes)
