"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Upload,
  X,
  Search,
  History,
  ArrowLeft,
  FileText,
  MapPin,
  Users,
  Phone,
  Zap,
  Building,
  Eye,
  DollarSign,
  Clock,
  Home,
  Wrench,
  Package,
  ShoppingCart,
  RotateCcw,
  Calculator,
  Download,
  Filter,
} from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";

// Configuration object
const CONFIG = {
  // Updated Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbyMck9gUPzYLdguUYNSv3Rf51RoApz7b3HjsoJGVEl2qjPmsxzu8SkMfMHY3a0YbUGO/exec",

  // Updated Google Drive folder ID for file uploads
  DRIVE_FOLDER_ID: "113JJSny0edSxkwl9MpjTmNJo0uZuHqVn",

  // Sheet names
  SOURCE_SHEET_NAME: "INVENTORY",
  HISTORY_SHEET_NAME: "INVENTORY History",

  // Updated page configuration
  PAGE_CONFIG: {
    title: "All INVENTORY",
    historyTitle: "History",
  },
};

// Column configuration for visibility filter
const COLUMN_CONFIG = [
  { key: 'action', label: 'Action', pendingOnly: true },
  { key: 'serialNo', label: 'Serial No', pendingOnly: false },
  { key: 'inventoryType', label: 'Inventory Type', pendingOnly: false },
  { key: 'department', label: 'Department', pendingOnly: false },
  { key: 'itemsName', label: 'Items Name', pendingOnly: false },
  { key: 'receiveDate', label: 'Receive Date', pendingOnly: false },
  { key: 'openingBalance', label: 'Opening Balance', pendingOnly: false },
  { key: 'purchaseData', label: 'Purchase Data', pendingOnly: false },
  { key: 'issueData', label: 'Issue Data', pendingOnly: false },
  { key: 'returnData', label: 'Return Data', pendingOnly: false },
  { key: 'damageItems', label: 'Damage Items', pendingOnly: false },
  { key: 'missingItems', label: 'Missing Items', pendingOnly: false },
  { key: 'closingBalance', label: 'Closing Balance', pendingOnly: false },
  { key: 'totalBalance', label: 'Total Balance', pendingOnly: false },
  { key: 'uploadFile', label: 'Upload File', pendingOnly: false },
  { key: 'unit', label: 'Unit', pendingOnly: false },
  { key: 'perUnitPrice', label: 'Per Unit Price', pendingOnly: false },
  { key: 'partyName', label: 'Party Name', pendingOnly: false },
  { key: 'eventDate', label: 'Event Date', pendingOnly: false },
  { key: 'foodName', label: 'Food Name', pendingOnly: false },
  { key: 'remarks', label: 'Remarks', pendingOnly: false },
];

// Debounce hook for search optimization
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Function to format date to dd/mm/yyyy
function formatDate(dateString) {
  if (!dateString) return "";

  // If it's already in the correct format, return as is
  if (typeof dateString === "string" && dateString.includes("/")) {
    return dateString;
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
}

// Function to convert date string to Date object for comparison
function parseDate(dateString) {
  if (!dateString) return null;
  
  // Handle dd/mm/yyyy format
  if (dateString.includes("/")) {
    const parts = dateString.split("/");
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  
  // Fallback to standard date parsing
  return new Date(dateString);
}

function Inventory() {
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [inventoryTypes, setInventoryTypes] = useState([]);
  const [selectedInventoryType, setSelectedInventoryType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partyNameFilter, setPartyNameFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editableData, setEditableData] = useState({});

  // Column visibility states
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // Initialize with all columns visible
    const initialState = {};
    COLUMN_CONFIG.forEach(col => {
      initialState[col.key] = true;
    });
    return initialState;
  });

  // Debounced filters for better performance
  const debouncedPartyNameFilter = useDebounce(partyNameFilter, 300);

  useEffect(() => {
    const role = sessionStorage.getItem("role");
    const user = sessionStorage.getItem("username");
    setUserRole(role || "");
    setUsername(user || "");
    fetchData();
    fetchInventoryTypes();
  }, []);

  // Close column filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showColumnFilter && !event.target.closest('.column-filter-container')) {
        setShowColumnFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColumnFilter]);

  // Fetch inventory types from Master Drop-Down sheet
  const fetchInventoryTypes = useCallback(async () => {
    try {
      const response = await fetch(
        `${CONFIG.APPS_SCRIPT_URL}?sheet=Master Drop-Down&action=fetch&ts=${Date.now()}`
      );

      const result = await response.json();

      if (result.success && result.data) {
        // Extract unique values from Column A (index 0)
        const types = [...new Set(result.data.slice(1).map(row => row[0]).filter(Boolean))];
        setInventoryTypes(types);
      }
    } catch (err) {
      console.error("Error fetching inventory types:", err);
    }
  }, []);

function getDisplayableImageUrl(url) {
  if (!url) return null;

  try {
    // Handle direct file ID URLs
    const directMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (directMatch && directMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${directMatch[1]}&sz=w200`;
    }

    // Handle uc?export=view&id= format
    const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch && ucMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w200`;
    }

    // Handle open?id= format
    const openMatch = url.match(/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch && openMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w200`;
    }

    // If it's already a thumbnail URL, return as is
    if (url.includes("thumbnail?id=")) {
      return url;
    }

    // If URL contains a file ID but doesn't match any pattern above
    // Try to extract any potential file ID
    const anyIdMatch = url.match(/([a-zA-Z0-9_-]{25,})/);
    if (anyIdMatch && anyIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${anyIdMatch[1]}&sz=w200`;
    }

    // If no file ID found, return the original URL with cache buster
    const cacheBuster = Date.now();
    return url.includes("?") ? `${url}&cb=${cacheBuster}` : `${url}?cb=${cacheBuster}`;
  } catch (e) {
    console.error("Error processing image URL:", url, e);
    return url; // Return original URL as fallback
  }
}

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const pendingResponse = await fetch(
        `${CONFIG.APPS_SCRIPT_URL}?sheet=${
          CONFIG.SOURCE_SHEET_NAME
        }&action=fetch&ts=${Date.now()}`
      );

      const pendingResult = await pendingResponse.json();

      if (!pendingResult.success) {
        throw new Error(pendingResult.error || "Failed to fetch pending data");
      }

      const pendingRows = pendingResult.data.slice(1)
        .map((row, index) => {
          return {
            id: index + 1,
            serialNo: row[1] || "",
            inventoryType: row[2] || "",
            department: row[3] || "",
            itemsName: row[4] || "",
            receiveDate: formatDate(row[5]),
            openingBalance: parseInt(row[6]) || 0,
            purchaseData: parseInt(row[7]) || 0,
            issueData: parseInt(row[8]) || 0,
            returnData: parseInt(row[9]) || 0,
            damageItems: parseInt(row[10]) || 0,
            missingItems: parseInt(row[11]) || 0,
            closingBalance: parseInt(row[12]) || "",
            totalBalance: parseInt(row[13]) || "",
            uploadFile: row[14] || null,
            unit: row[15] || "",
            perUnitPrice: parseInt(row[16]) || 0,
            partyName: row[17] || "",
            eventDate: formatDate(row[18]),
            rawEventDate: row[18], // Keep original for filtering
            foodName: row[19] || "",
            remarks: row[20] || "",
          };
        })

      setPendingData(pendingRows);

      // Fetch history data from CROCKERY History sheet
      const historyResponse = await fetch(
        `${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.HISTORY_SHEET_NAME}&action=fetch`
      );
      const historyResult = await historyResponse.json();

      if (!historyResult.success) {
        throw new Error(historyResult.error || "Failed to fetch history data");
      }

      // Convert sheet data to objects (skip header row) and filter for Crockery
      const historyRows = historyResult.data.slice(1)
        .map((row, index) => {
          return {
            id: index + 1000,
            serialNo: row[1] || "",
            inventoryType: row[2] || "",
            department: row[3] || "",
            itemsName: row[4] || "",
            receiveDate: formatDate(row[5]),
            openingBalance: parseInt(row[6]) || 0,
            purchaseData: parseInt(row[7]) || 0,
            issueData: parseInt(row[8]) || 0,
            returnData: parseInt(row[9]) || 0,
            damageItems: parseInt(row[10]) || 0,
            missingItems: parseInt(row[11]) || 0,
            closingBalance: parseInt(row[12]) || "",
            totalBalance: parseInt(row[13]) || "",
            uploadFile: row[14] || null,
            unit: row[15] || "",
            perUnitPrice: parseInt(row[16]) || 0,
            partyName: row[17] || "",
            eventDate: formatDate(row[18]),
            rawEventDate: row[18], // Keep original for filtering
            foodName: row[19] || "",
            remarks: row[20] || "",
          };
        })
      setHistoryData(historyRows);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [])

    // Optimized filtered data with debounced search and additional filters
  const filteredPendingData = useMemo(() => {
    let filteredData = pendingData;
    
    // Filter by inventory type
    if (selectedInventoryType) {
      filteredData = filteredData.filter(
        (record) => record.inventoryType === selectedInventoryType
      );
    }
    
    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      filteredData = filteredData.filter((record) => {
        if (!record.rawEventDate) return false;
        const eventDate = parseDate(record.rawEventDate);
        if (!eventDate) return false;
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= start;
      });
    }
    
   if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter((record) => {
        if (!record.rawEventDate) return false;
        const eventDate = parseDate(record.rawEventDate);
        return eventDate && eventDate <= end;
      });
    }
    
    // Filter by party name
    if (debouncedPartyNameFilter) {
      filteredData = filteredData.filter((record) =>
        record.partyName && record.partyName
          .toLowerCase()
          .includes(debouncedPartyNameFilter.toLowerCase())
      );
    }
    
    return filteredData;
  }, [pendingData, selectedInventoryType, startDate, endDate, debouncedPartyNameFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const filteredData = filteredPendingData; // Use filtered data instead of all pending data
    const totalOpeningBalance = filteredData.reduce(
      (sum, item) => sum + item.openingBalance,
      0
    );
    const totalPurchaseData = filteredData.reduce(
      (sum, item) => sum + item.purchaseData,
      0
    );
    const totalReturn = filteredData.reduce((sum, item) => sum + item.returnData, 0);
    const subTotalBalance = filteredData.reduce(
      (sum, item) => sum + item.totalBalance,
      0
    );

    return {
      totalOpeningBalance,
      totalPurchaseData,
      totalReturn,
      subTotalBalance,
    };
  }, [filteredPendingData]);

  const filteredHistoryData = useMemo(() => {
    let filteredData = historyData;
    
    // Filter by inventory type
    if (selectedInventoryType) {
      filteredData = filteredData.filter(
        (record) => record.inventoryType === selectedInventoryType
      );
    }
    
    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      filteredData = filteredData.filter((record) => {
        if (!record.rawEventDate) return false;
        const eventDate = parseDate(record.rawEventDate);
        if (!eventDate) return false;
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= start;
      });
    }
    
   if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter((record) => {
        if (!record.rawEventDate) return false;
        const eventDate = parseDate(record.rawEventDate);
        return eventDate && eventDate <= end;
      });
    }

    // Filter by party name
    if (debouncedPartyNameFilter) {
      filteredData = filteredData.filter((record) =>
        record.partyName && record.partyName
          .toLowerCase()
          .includes(debouncedPartyNameFilter.toLowerCase())
      );
    }
    
    return filteredData;
  }, [historyData, selectedInventoryType, startDate, endDate, debouncedPartyNameFilter]);

  // Function to download data as Excel
  const downloadExcel = useCallback(() => {
    // Filter data based on current filters
    const dataToDownload = showHistory ? filteredHistoryData : filteredPendingData;
    
    if (dataToDownload.length === 0) {
      alert("No data to download");
      return;
    }

    // Create CSV content
    const headers = ["Serial No", "Inventory Type", "Items Name", "Party Name", "Event Date"];
    const csvContent = [
      headers.join(","),
      ...dataToDownload.map(item => [
        item.serialNo,
        `"${item.inventoryType.replace(/"/g, '""')}"`,
        `"${item.itemsName.replace(/"/g, '""')}"`,
        `"${item.partyName.replace(/"/g, '""')}"`,
        item.eventDate
      ].join(","))
    ].join("\n");

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_data.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredPendingData, filteredHistoryData, showHistory]);

  const handleRowSelect = useCallback(
    (id) => {
      setSelectedRows((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
          // Remove from editable data when deselected
          setEditableData((prevData) => {
            const newData = { ...prevData };
            delete newData[id];
            return newData;
          });
        } else {
          newSet.add(id);
          // Initialize editable data for this row
          const rowData = pendingData.find((item) => item.id === id);
          if (rowData) {
            setEditableData((prevData) => ({
              ...prevData,
              [id]: { ...rowData },
            }));
          }
        }
        return newSet;
      });
    },
    [pendingData]
  );

  const handleEditableChange = useCallback((id, field, value) => {
    setEditableData((prevData) => ({
      ...prevData,
      [id]: {
        ...prevData[id],
        [field]: value,
      },
    }));
  }, []);

async function handleFileUpload(rowId, file) {
  const base64Data = await fileToBase64(file); // helper function
  const res = await fetch("YOUR_APP_SCRIPT_URL", {
    method: "POST",
    body: new URLSearchParams({
      action: "uploadFile",
      base64Data,
      fileName: file.name,
      mimeType: file.type,
      folderId: "YOUR_DRIVE_FOLDER_ID",
    }),
  });

  const data = await res.json();
  if (data.success) {
    // Update React state immediately
    setEditableData((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        uploadFile: data.fileUrl,
      },
    }));
  }
}

  // Function to upload file to Google Drive
  const uploadFileToDrive = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append("action", "uploadFile");
      formData.append("base64Data", await fileToBase64(file));
      formData.append("fileName", file.name);
      formData.append("mimeType", file.type);
      formData.append("folderId", CONFIG.DRIVE_FOLDER_ID);

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to upload file");
      }

      return result.fileUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }, []);

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSaveChanges = useCallback(async () => {
    try {
      setLoading(true);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimestamp = `${day}/${month}/${year}, ${hours}:${minutes}`;

      // Prepare data for submission
      const updates = await Promise.all(
        Array.from(selectedRows).map(async (id) => {
          const data = editableData[id];
          const originalData = pendingData.find((item) => item.id === id);

          // Handle file upload if a new file is selected
          let fileUrl = data.uploadFile;
          if (data.uploadFile instanceof File) {
            fileUrl = await uploadFileToDrive(data.uploadFile);
          }

          return {
            id,
            rowData: [
              currentTimestamp, // Column A - Current timestamp
              "", // Column B - Serial number (will be preserved)
              data.inventoryType || "", // Column C - NEW Inventory Type
              data.department || "", // Column D
              data.itemsName || "", // Column E
              data.receiveDate || "", // Column F
              data.openingBalance || 0, // Column G
              data.purchaseData || 0, // Column H
              data.issueData || 0, // Column I
              data.returnData || 0, // Column J
              data.damageItems || 0, // Column K
              data.missingItems || 0, // Column L
              data.closingBalance || "", // Column M
              data.totalBalance || "", // Column N
              fileUrl || "", // Column O - Use the uploaded file URL
              data.unit || "", // Column P
              data.perUnitPrice || 0, // Column Q
              data.partyName || "", // Column R
              data.eventDate || "", // Column S
              data.foodName || "", // Column T
              data.remarks || "", // Column U
            ],
            originalRowIndex: id + 1, // +1 to account for header row
          };
        })
      );

      // Update each row in the Google Sheet
      for (const update of updates) {
        // First, get the current serial number from the row
        const getSerialResponse = await fetch(
          `${CONFIG.APPS_SCRIPT_URL}?action=getSerial&sheetName=${CONFIG.SOURCE_SHEET_NAME}&rowIndex=${update.originalRowIndex}`
        );
        const serialResult = await getSerialResponse.json();

        if (!serialResult.success) {
          throw new Error(serialResult.error || "Failed to get serial number");
        }

        // Update the row data with the serial number
        update.rowData[1] = serialResult.serialNumber;

        // Update the main sheet
        const updateResponse = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            action: "update",
            sheetName: CONFIG.SOURCE_SHEET_NAME,
            rowIndex: update.originalRowIndex,
            rowData: JSON.stringify(update.rowData),
          }),
        });

        const updateResult = await updateResponse.json();
        if (!updateResult.success) {
          throw new Error(updateResult.error || "Failed to update data");
        }

        // Also add to history sheet with the same timestamp
        const historyResponse = await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            action: "insertHistory",
            sheetName: CONFIG.SOURCE_SHEET_NAME,
            rowData: JSON.stringify(update.rowData),
            serialNumber: serialResult.serialNumber,
          }),
        });

        const historyResult = await historyResponse.json();
        if (!historyResult.success) {
          throw new Error(historyResult.error || "Failed to add to history");
        }
      }

      // Refresh data after successful update
      await fetchData();

      setSelectedRows(new Set());
      setEditableData({});
      setSuccessMessage("Changes saved successfully and added to history!");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error("Error saving changes:", err);
      setError(err.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  }, [editableData, selectedRows, fetchData, pendingData, uploadFileToDrive]);

  const toggleSection = useCallback((section) => {
    setShowHistory(section === "history");
    setSelectedRows(new Set());
    setEditableData({});
  }, []);

  // Column visibility handlers
  const handleColumnToggle = useCallback((columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  }, []);

// Also update the handleSelectAllColumns to prevent the same issue
const handleSelectAllColumns = useCallback((e) => {
  // Prevent event propagation to avoid closing the popup
  e.stopPropagation();
  
  const newState = {};
  COLUMN_CONFIG.forEach(col => {
    if (showHistory && col.pendingOnly) return;
    newState[col.key] = true;
  });
  setVisibleColumns(newState);
}, [showHistory]);

  // Get visible columns for current section
  const getVisibleColumnsForCurrentSection = useCallback(() => {
    return COLUMN_CONFIG.filter(col => {
      if (showHistory && col.pendingOnly) return false;
      return visibleColumns[col.key];
    });
  }, [visibleColumns, showHistory]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-xl font-bold tracking-tight text-blue-700">
            {CONFIG.PAGE_CONFIG.title}
          </h1>

          <div className="flex flex-wrap gap-2">
            {/* Party Name Filter */}
            <div className="relative">
              <Users
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Party Name"
                value={partyNameFilter}
                onChange={(e) => setPartyNameFilter(e.target.value)}
                className="pl-9 pr-4 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Inventory Type Dropdown */}
            <select
              value={selectedInventoryType}
              onChange={(e) => setSelectedInventoryType(e.target.value)}
              className="px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Inventory Types</option>
              {inventoryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {/* Start Date Selector */}
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full"
                placeholder="Start Date"
              />
              {startDate && (
                <span className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  {startDate}
                </span>
              )}
            </div>

            {/* End Date Selector */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full"
                placeholder="End Date"
              />
              {endDate && (
                <span className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500">
                  {endDate}
                </span>
              )}
            </div>

            <button
              onClick={downloadExcel}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </button>

            {selectedRows.size > 0 && !showHistory && (
              <button
                onClick={handleSaveChanges}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Opening Balance</p>
                <p className="text-2xl font-bold">
                  {summaryStats.totalOpeningBalance}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Purchase Data</p>
                <p className="text-2xl font-bold">
                  {summaryStats.totalPurchaseData}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Total Return</p>
                <p className="text-2xl font-bold">{summaryStats.totalReturn}</p>
              </div>
              <RotateCcw className="h-8 w-8 text-yellow-200" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Sub Total Balance</p>
                <p className="text-2xl font-bold">
                  ₹{summaryStats.subTotalBalance.toLocaleString()}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Section Toggle Buttons */}
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => toggleSection("pending")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              !showHistory
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Pending Inventory ({filteredPendingData.length})
            </div>
          </button>
          <button
            onClick={() => toggleSection("history")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              showHistory
                ? "border-blue-500 text-blue-600 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <History className="h-4 w-4 mr-2" />
              Inventory History ({filteredHistoryData.length})
            </div>
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              {successMessage}
            </div>
            <button
              onClick={() => setSuccessMessage("")}
              className="text-green-500 hover:text-green-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <X className="h-4 w-4 mr-2 text-red-500" />
              {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Table Container with Fixed Height */}
        <div className="rounded-lg border border-blue-200 shadow-md bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3 flex items-center justify-between">
            <div>
              <h2 className="text-blue-700 font-medium flex items-center text-sm">
                {showHistory ? "Inventory History" : "Pending Inventory Items"}
              </h2>
              <p className="text-blue-600 text-xs">
                {showHistory
                  ? "View completed inventory transactions"
                  : "Manage pending inventory items - select rows to edit"}
              </p>
            </div>

            {/* Column Filter Button */}
            <div className="relative column-filter-container">
              <button
                onClick={() => setShowColumnFilter(!showColumnFilter)}
                className="flex items-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                Columns
              </button>

              {/* Column Filter Popup */}
              {showColumnFilter && (
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-64 max-h-80 overflow-y-auto z-10">
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900 text-sm mb-2">
                      Show/Hide Columns
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllColumns}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Select All
                      </button>
                    </div>
                  </div>
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {COLUMN_CONFIG.filter(
                      (col) => !(showHistory && col.pendingOnly)
                    ).map((column) => (
                      <label
                        key={column.key}
                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[column.key] || false}
                          onChange={() => handleColumnToggle(column.key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                        />
                        <span className="text-sm text-gray-700">
                          {column.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-blue-600 text-sm">Loading inventory data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center text-sm">
              {error}{" "}
              <button className="underline ml-2" onClick={fetchData}>
                Try again
              </button>
            </div>
          ) : (
            /* Table with Fixed Height and Scrolling */
            <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {!showHistory && visibleColumns.action && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                    {visibleColumns.serialNo && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serial No
                      </th>
                    )}
                    {visibleColumns.inventoryType && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inventory Type
                      </th>
                    )}
                    {visibleColumns.department && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                    )}
                    {visibleColumns.itemsName && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items Name
                      </th>
                    )}
                    {visibleColumns.receiveDate && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Receive Date
                      </th>
                    )}
                    {visibleColumns.openingBalance && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opening Balance
                      </th>
                    )}
                    {visibleColumns.purchaseData && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchase Data
                      </th>
                    )}
                    {visibleColumns.issueData && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issue Data
                      </th>
                    )}
                    {visibleColumns.returnData && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Return Data
                      </th>
                    )}
                    {visibleColumns.damageItems && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Damage Items
                      </th>
                    )}
                    {visibleColumns.missingItems && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Missing Items
                      </th>
                    )}
                    {visibleColumns.closingBalance && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Closing Balance
                      </th>
                    )}
                    {visibleColumns.totalBalance && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Balance
                      </th>
                    )}
                    {visibleColumns.uploadFile && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Upload File
                      </th>
                    )}
                    {visibleColumns.unit && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                    )}
                    {visibleColumns.perUnitPrice && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Per Unit Price
                      </th>
                    )}
                    {visibleColumns.partyName && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Party Name
                      </th>
                    )}
                    {visibleColumns.eventDate && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event Date
                      </th>
                    )}
                    {visibleColumns.foodName && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Food Name
                      </th>
                    )}
                    {visibleColumns.remarks && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Remarks
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {showHistory ? (
                    filteredHistoryData.length > 0 ? (
                      filteredHistoryData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          {visibleColumns.serialNo && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.serialNo}
                            </td>
                          )}
                          {visibleColumns.inventoryType && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.inventoryType}
                            </td>
                          )}
                          {visibleColumns.department && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.department}
                            </td>
                          )}
                          {visibleColumns.itemsName && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.itemsName}
                            </td>
                          )}
                          {visibleColumns.receiveDate && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.receiveDate}
                            </td>
                          )}
                          {visibleColumns.openingBalance && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.openingBalance}
                            </td>
                          )}
                          {visibleColumns.purchaseData && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.purchaseData}
                            </td>
                          )}
                          {visibleColumns.issueData && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.issueData}
                            </td>
                          )}
                          {visibleColumns.returnData && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.returnData}
                            </td>
                          )}
                          {visibleColumns.damageItems && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.damageItems}
                            </td>
                          )}
                          {visibleColumns.missingItems && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.missingItems}
                            </td>
                          )}
                          {visibleColumns.closingBalance && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.closingBalance}
                            </td>
                          )}
                          {visibleColumns.totalBalance && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              ₹{record.totalBalance.toLocaleString()}
                            </td>
                          )}
                          {visibleColumns.uploadFile && (
  <td className="px-2 py-3 whitespace-nowrap text-xs">
    {record.uploadFile ? (
      <div className="flex items-center justify-center">
        <img
          src={getDisplayableImageUrl(record.uploadFile)}
          alt="Uploaded file"
          className="max-h-16 max-w-24 object-contain cursor-pointer border border-gray-200"
          onClick={() => window.open(record.uploadFile, "_blank")}
          onError={(e) => {
            console.log("Image failed to load:", e.target.src);
            
            // First try the original URL directly
            if (e.target.src !== record.uploadFile) {
              console.log("Trying original URL:", record.uploadFile);
              e.target.src = record.uploadFile;
            } else {
              // If that also fails, show file icon
              console.log("Both thumbnail and original URL failed");
              e.target.style.display = "none";
              const fallbackDiv = e.target.nextElementSibling;
              if (fallbackDiv) {
                fallbackDiv.style.display = "flex";
              }
            }
          }}
          onLoad={(e) => {
            console.log("Image loaded successfully:", e.target.src);
          }}
          style={{
            minHeight: "40px",
            minWidth: "40px",
          }}
        />
        <div
          className="hidden items-center justify-center w-16 h-16 bg-gray-100 rounded border border-gray-200 cursor-pointer"
          onClick={() => window.open(record.uploadFile, "_blank")}
        >
          <FileText className="h-6 w-6 text-gray-500" />
        </div>
      </div>
    ) : (
      <span className="text-gray-400">—</span>
    )}
  </td>
)}
                          {visibleColumns.unit && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.unit}
                            </td>
                          )}
                          {visibleColumns.perUnitPrice && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              ₹{record.perUnitPrice}
                            </td>
                          )}
                          {visibleColumns.partyName && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.partyName}
                            </td>
                          )}
                          {visibleColumns.eventDate && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.eventDate}
                            </td>
                          )}
                          {visibleColumns.foodName && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.foodName}
                            </td>
                          )}
                          {visibleColumns.remarks && (
                            <td
                              className="px-2 py-3 max-w-xs text-xs text-gray-900 truncate"
                              title={record.remarks}
                            >
                              {record.remarks}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={getVisibleColumnsForCurrentSection().length}
                          className="px-4 py-8 text-center text-gray-500 text-sm"
                        >
                          {selectedInventoryType ||
                          startDate ||
                          endDate ||
                          partyNameFilter
                            ? "No history records matching your filters"
                            : "No inventory history found"}
                        </td>
                      </tr>
                    )
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((record) => {
                      const isSelected = selectedRows.has(record.id);
                      const editData = editableData[record.id] || record;
                      return (
                        <tr
                          key={record.id}
                          className={`hover:bg-gray-50 ${
                            isSelected ? "bg-blue-50" : ""
                          }`}
                        >
                          {visibleColumns.action && (
                            <td className="px-2 py-3 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleRowSelect(record.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          )}
                          {visibleColumns.serialNo && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.serialNo}
                            </td>
                          )}
                          {visibleColumns.inventoryType && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.inventoryType}
                            </td>
                          )}
                          {visibleColumns.department && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.department}
                            </td>
                          )}
                          {visibleColumns.itemsName && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.itemsName}
                            </td>
                          )}
                          {visibleColumns.receiveDate && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="date"
                                  value={
                                    editData.receiveDate
                                      ? new Date(
                                          editData.receiveDate
                                            .split("/")
                                            .reverse()
                                            .join("-")
                                        )
                                          .toISOString()
                                          .split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "receiveDate",
                                      e.target.value
                                        ? formatDate(e.target.value)
                                        : ""
                                    )
                                  }
                                  className="w-full px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.receiveDate}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.openingBalance && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="number"
                                  value={editData.openingBalance}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "openingBalance",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.openingBalance}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.purchaseData && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="number"
                                  value={editData.purchaseData}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "purchaseData",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.purchaseData}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.issueData && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="number"
                                  value={editData.issueData}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "issueData",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.issueData}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.returnData && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="number"
                                  value={editData.returnData}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "returnData",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.returnData}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.damageItems && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="number"
                                  value={editData.damageItems}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "damageItems",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.damageItems}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.missingItems && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="number"
                                  value={editData.missingItems}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "missingItems",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.missingItems}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.closingBalance && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              {record.closingBalance}
                            </td>
                          )}
                          {visibleColumns.totalBalance && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-900">
                              ₹{record.totalBalance.toLocaleString()}
                            </td>
                          )}
                          {visibleColumns.uploadFile && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <div className="flex flex-col items-center">
                                  <input
                                    type="file"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        handleEditableChange(
                                          record.id,
                                          "uploadFile",
                                          file
                                        );

                                        // Create a preview
                                        const reader = new FileReader();
                                        reader.onload = (e) => {
                                          // This is just for preview, the actual upload happens when saving
                                          const imgElement =
                                            document.getElementById(
                                              `preview-${record.id}`
                                            );
                                          if (imgElement) {
                                            imgElement.src = e.target.result;
                                            imgElement.style.display = "block";
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    accept="image/*"
                                  />
                                  {editData.uploadFile instanceof File ? (
                                    <img
                                      id={`preview-${record.id}`}
                                      src={URL.createObjectURL(
                                        editData.uploadFile
                                      )}
                                      alt="File preview"
                                      className="max-h-16 max-w-24 object-contain mt-1 border border-gray-200"
                                      style={{
                                        minHeight: "40px",
                                        minWidth: "40px",
                                      }}
                                    />
                                  ) : typeof editData.uploadFile === "string" &&
                                    editData.uploadFile ? (
                                    <img
                                      src={getDisplayableImageUrl(
                                        editData.uploadFile
                                      )}
                                      alt="Current file"
                                      className="max-h-16 max-w-24 object-contain mt-1 border border-gray-200"
                                      style={{
                                        minHeight: "40px",
                                        minWidth: "40px",
                                      }}
                                      onError={(e) => {
                                        console.log(
                                          "Edit image failed to load:",
                                          e.target.src
                                        );
                                        if (
                                          e.target.src.includes("thumbnail")
                                        ) {
                                          e.target.src = editData.uploadFile;
                                        } else {
                                          e.target.style.display = "none";
                                          const fallbackDiv =
                                            e.target.nextElementSibling;
                                          if (fallbackDiv) {
                                            fallbackDiv.style.display = "flex";
                                          }
                                        }
                                      }}
                                      onLoad={(e) => {
                                        console.log(
                                          "Edit image loaded successfully:",
                                          e.target.src
                                        );
                                      }}
                                    />
                                  ) : null}
                                  {typeof editData.uploadFile === "string" &&
                                    editData.uploadFile && (
                                      <div className="hidden items-center justify-center w-16 h-16 bg-gray-100 rounded border border-gray-200 mt-1">
                                        <FileText className="h-6 w-6 text-gray-500" />
                                      </div>
                                    )}
                                </div>
                              ) : record.uploadFile ? (
                                <div className="flex items-center justify-center">
                                  <img
                                    src={getDisplayableImageUrl(
                                      record.uploadFile
                                    )}
                                    alt="Uploaded file"
                                    className="max-h-16 max-w-24 object-contain cursor-pointer border border-gray-200"
                                    onClick={() =>
                                      window.open(record.uploadFile, "_blank")
                                    }
                                    style={{
                                      minHeight: "40px",
                                      minWidth: "40px",
                                    }}
                                    onError={(e) => {
                                      if (e.target.src.includes("thumbnail")) {
                                        e.target.src = record.uploadFile;
                                      } else {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display =
                                          "inline-flex";
                                      }
                                    }}
                                  />
                                  <div
                                    className="hidden items-center justify-center w-16 h-16 bg-gray-100 rounded border border-gray-200 cursor-pointer"
                                    onClick={() =>
                                      window.open(record.uploadFile, "_blank")
                                    }
                                  >
                                    <FileText className="h-6 w-6 text-gray-500" />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          )}
                          {visibleColumns.unit && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={editData.unit}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "unit",
                                      e.target.value
                                    )
                                  }
                                  className="w-16 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.unit}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.perUnitPrice && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="number"
                                  value={editData.perUnitPrice}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "perUnitPrice",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  ₹{record.perUnitPrice}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.partyName && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={editData.partyName}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "partyName",
                                      e.target.value
                                    )
                                  }
                                  className="w-24 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.partyName}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.eventDate && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="date"
                                  value={
                                    editData.eventDate
                                      ? new Date(
                                          editData.eventDate
                                            .split("/")
                                            .reverse()
                                            .join("-")
                                        )
                                          .toISOString()
                                          .split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "eventDate",
                                      e.target.value
                                        ? formatDate(e.target.value)
                                        : ""
                                    )
                                  }
                                  className="w-full px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.eventDate}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.foodName && (
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              {isSelected ? (
                                <input
                                  type="text"
                                  value={editData.foodName}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "foodName",
                                      e.target.value
                                    )
                                  }
                                  className="w-24 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              ) : (
                                <span className="text-gray-900">
                                  {record.foodName}
                                </span>
                              )}
                            </td>
                          )}
                          {visibleColumns.remarks && (
                            <td className="px-2 py-3 max-w-xs text-xs">
                              {isSelected ? (
                                <textarea
                                  value={editData.remarks}
                                  onChange={(e) =>
                                    handleEditableChange(
                                      record.id,
                                      "remarks",
                                      e.target.value
                                    )
                                  }
                                  rows={1}
                                  className="w-full px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                />
                              ) : (
                                <span
                                  className="text-gray-900 truncate block"
                                  title={record.remarks}
                                >
                                  {record.remarks}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={getVisibleColumnsForCurrentSection().length}
                        className="px-4 py-8 text-center text-gray-500 text-sm"
                      >
                        {selectedInventoryType ||
                        startDate ||
                        endDate ||
                        partyNameFilter
                          ? "No pending inventory items matching your filters"
                          : "No pending inventory items found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default Inventory;