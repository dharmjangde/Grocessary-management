import { useState, useEffect } from "react";
import { FileImage, Calendar } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";

export default function InventoryForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState({
    inventoryTypeOptions: [],
    departmentOptions: [],
    unitOptions: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const [formData, setFormData] = useState({
    inventoryType: "",
    department: "",
    itemsName: "",
    receiveDate: "",
    openingBalance: "",
    purchaseData: "",
    perUnit: "",
    issueData: "",
    returnData: "",
    damageItems: "",
    missingItems: "",
    unit: "",
    partyName: "",
    eventDate: "",
    foodName: "",
    remarks: ""
  });

  const scriptUrl = "https://script.google.com/macros/s/AKfycbynQzA2nABR-BLwrvbuFEL31BWSZngciUDWhx5e-pIUl4wGNbOUyEwMn2jJtaNocvzj/exec";
  const folderId = "1qqVz8ZAYrQbdwbIWuLueA2_LkBqvPhbd"; // Google Drive folder ID

  // Show toast message
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Fetch dropdown options from Google Sheets
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const response = await fetch(`${scriptUrl}?action=fetch&sheet=Master Drop-Down`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 1) {
          // Skip the header row (index 0)
          const rows = result.data.slice(1);
          
          // Extract unique values from each column
          const inventoryTypes = [...new Set(rows.map(row => row[0]).filter(Boolean))];
          const departments = [...new Set(rows.map(row => row[1]).filter(Boolean))];
          const units = [...new Set(rows.map(row => row[2]).filter(Boolean))];
          
          setDropdownOptions({
            inventoryTypeOptions: inventoryTypes,
            departmentOptions: departments,
            unitOptions: units
          });
        }
      } catch (error) {
        console.error("Error fetching dropdown options:", error);
        // Don't show error, just keep arrays empty
      } finally {
        setIsLoading(false);
      }
    };

    fetchDropdownOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToDrive = async (file) => {
    setImageUploading(true);
    try {
      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });

      // Upload to Google Drive via Apps Script
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'uploadFile',
          base64Data: base64Data,
          fileName: file.name,
          mimeType: file.type,
          folderId: folderId
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to upload image");
      }

      return result.fileUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setImageUploading(false);
    }
  };

  const getSerialNumberPrefix = (inventoryType) => {
    switch(inventoryType) {
      case "Crockery": return "CR";
      case "Disposal": return "DI";
      case "Decor": return "DE";
      case "Grocery": return "GR";
      case "Dresses": return "DR";
      default: return "SN";
    }
  };

  const generateUniqueSerialNumber = async (inventoryType) => {
    const prefix = getSerialNumberPrefix(inventoryType);

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'getLastSerial',
          sheetName: "INVENTORY",
          inventoryType: inventoryType
        })
      });

      const result = await response.json();

      let nextNumber = 1;
      if (result.success && result.lastSerial) {
        const parts = result.lastSerial.split("-");
        const num = parseInt(parts[1], 10);
        if (!isNaN(num)) {
          nextNumber = num + 1;
        }
      }

      const formattedNumber = String(nextNumber).padStart(3, '0');
      return `${prefix}-${formattedNumber}`;
    } catch (error) {
      console.error("Error fetching last serial number:", error);
      return `${prefix}-001`; // fallback
    }
  };

  const calculateClosingBalance = () => {
    const opening = parseFloat(formData.openingBalance) || 0;
    const purchase = parseFloat(formData.purchaseData) || 0;
    const issue = parseFloat(formData.issueData) || 0;
    const returned = parseFloat(formData.returnData) || 0;
    const damaged = parseFloat(formData.damageItems) || 0;
    const missing = parseFloat(formData.missingItems) || 0;
    
    return opening + purchase - issue + returned - damaged - missing;
  };

  const calculateTotalBalance = () => {
    const closingBalance = calculateClosingBalance();
    const perUnit = parseFloat(formData.perUnit) || 0;
    
    return closingBalance * perUnit;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!formData.inventoryType) {
        throw new Error("Please select an inventory type");
      }

      // Upload image if selected
      let imageUrl = "";
      if (selectedImage) {
        imageUrl = await uploadImageToDrive(selectedImage);
      }

      // Generate serial number
      const serialNumber = await generateUniqueSerialNumber(formData.inventoryType);

      // Calculate closing balance and total balance
      const closingBalance = calculateClosingBalance();
      const totalBalance = calculateTotalBalance();

      // Prepare the data in the correct column order according to requirements
      const rowData = [
        new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }), // Column A: Timestamp
        serialNumber, // Column B: Serial No
        formData.inventoryType, // Column C: Inventory Type
        formData.department, // Column D: Department
        formData.itemsName, // Column E: Item Name
        formData.receiveDate, // Column F: Receive Date
        formData.openingBalance || 0, // Column G: Opening Balance
        formData.purchaseData || 0, // Column H: Purchase Data
        formData.issueData || 0, // Column I: Issue Data
        formData.returnData || 0, // Column J: Return Data
        formData.damageItems || 0, // Column K: Damage Items
        formData.missingItems || 0, // Column L: Missing Items
        "", // Column M: Closing Balance
        "", // Column N: Total Balance
        imageUrl || "No Image", // Column O: Image URL or placeholder
        formData.unit, // Column P: Unit
        formData.perUnit || 0, // Column Q: Per Unit Price
        formData.partyName || "N/A", // Column R: Party name
        formData.eventDate || "N/A", // Column S: Event Date
        formData.foodName || "N/A", // Column T: Food Name
        formData.remarks || "N/A", // Column U: Remarks
      ];

      // Save to the main INVENTORY sheet
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'insert',
          sheetName: "INVENTORY",
          rowData: JSON.stringify(rowData)
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to save data");
      }

      showToast("Data saved successfully!");
      handleCancel();
      
    } catch (error) {
      console.error("Error saving data:", error);
      const errorMessage = error.message || "Failed to save data. Please try again.";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      inventoryType: "",
      department: "",
      itemsName: "",
      receiveDate: "",
      openingBalance: "",
      purchaseData: "",
      perUnit: "",
      issueData: "",
      returnData: "",
      damageItems: "",
      missingItems: "",
      unit: "",
      partyName: "",
      eventDate: "",
      foodName: "",
      remarks: ""
    });
    setSelectedImage(null);
    setImagePreview(null);
    setError(null);
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto mb-8">
        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-md text-white ${
            toast.type === "error" ? "bg-red-500" : "bg-green-500"
          }`}>
            {toast.message}
          </div>
        )}
        
        <div className="rounded-lg border border-purple-200 bg-white shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-purple-100">
            <center>
              <h2 className="text-lg font-semibold text-purple-700">
                Inventory Management Form
              </h2>
            </center>
          </div>
          
          <form onSubmit={handleSave} className="p-4 space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Inventory Information */}
            <div className="space-y-3">
              <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                Basic Inventory Information
              </h3>
              
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label htmlFor="inventoryType" className="block text-xs font-medium text-purple-700">
                    Inventory Type *
                  </label>
                  <select
                    id="inventoryType"
                    name="inventoryType"
                    value={formData.inventoryType}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select Inventory Type</option>
                    {dropdownOptions.inventoryTypeOptions.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="department" className="block text-xs font-medium text-purple-700">
                    Department *
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select Department</option>
                    {dropdownOptions.departmentOptions.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="itemsName" className="block text-xs font-medium text-purple-700">
                    Items Name *
                  </label>
                  <input
                    type="text"
                    id="itemsName"
                    name="itemsName"
                    value={formData.itemsName}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="receiveDate" className="block text-xs font-medium text-purple-700">
                    Receive Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="receiveDate"
                      name="receiveDate"
                      value={formData.receiveDate}
                      onChange={handleChange}
                      required
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <Calendar className="absolute right-2 top-2 h-4 w-4 text-purple-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="partyName" className="block text-xs font-medium text-purple-700">
                    Party Name
                  </label>
                  <input
                    type="text"
                    id="partyName"
                    name="partyName"
                    value={formData.partyName}
                    onChange={handleChange}
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Inventory Quantities */}
            <div className="space-y-3">
              <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                Inventory Quantities & Data
              </h3>
              
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor="openingBalance" className="block text-xs font-medium text-purple-700">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    id="openingBalance"
                    name="openingBalance"
                    value={formData.openingBalance}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="purchaseData" className="block text-xs font-medium text-purple-700">
                    Purchase Data
                  </label>
                  <input
                    type="number"
                    id="purchaseData"
                    name="purchaseData"
                    value={formData.purchaseData}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="perUnit" className="block text-xs font-medium text-purple-700">
                    Per Unit (Price)
                  </label>
                  <input
                    type="number"
                    id="perUnit"
                    name="perUnit"
                    value={formData.perUnit}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="unit" className="block text-xs font-medium text-purple-700">
                    Unit *
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select Unit</option>
                    {dropdownOptions.unitOptions.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor="issueData" className="block text-xs font-medium text-purple-700">
                    Issue Data
                  </label>
                  <input
                    type="number"
                    id="issueData"
                    name="issueData"
                    value={formData.issueData}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="returnData" className="block text-xs font-medium text-purple-700">
                    Return Data
                  </label>
                  <input
                    type="number"
                    id="returnData"
                    name="returnData"
                    value={formData.returnData}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="damageItems" className="block text-xs font-medium text-purple-700">
                    Damage Items
                  </label>
                  <input
                    type="number"
                    id="damageItems"
                    name="damageItems"
                    value={formData.damageItems}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="missingItems" className="block text-xs font-medium text-purple-700">
                    Missing Items
                  </label>
                  <input
                    type="number"
                    id="missingItems"
                    name="missingItems"
                    value={formData.missingItems}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="space-y-3">
              <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                Event Information
              </h3>
              
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="eventDate" className="block text-xs font-medium text-purple-700">
                    Event Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      id="eventDate"
                      name="eventDate"
                      value={formData.eventDate}
                      onChange={handleChange}
                      className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <Calendar className="absolute right-2 top-2 h-4 w-4 text-purple-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="foodName" className="block text-xs font-medium text-purple-700">
                    Food Name
                  </label>
                  <input
                    type="text"
                    id="foodName"
                    name="foodName"
                    value={formData.foodName}
                    onChange={handleChange}
                    className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                File Upload
              </h3>
              
              <div className="space-y-1">
                <label htmlFor="uploadFile" className="block text-xs font-medium text-purple-700">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-3">
                  <label htmlFor="uploadFile" className="cursor-pointer">
                    <div className="text-center">
                      <FileImage className="mx-auto h-8 w-8 text-purple-400" />
                      <div className="mt-2">
                        <span className="block text-xs font-medium text-purple-600">
                          {selectedImage ? selectedImage.name : "Click to upload an image"}
                        </span>
                        <input
                          id="uploadFile"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </label>
                  {imagePreview && (
                    <div className="mt-3">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="mx-auto max-h-32 rounded border"
                      />
                    </div>
                  )}
                  {imageUploading && (
                    <div className="mt-2 text-xs text-purple-600">
                      Uploading image...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-3">
              <h3 className="text-md font-medium text-purple-700 border-b border-purple-100 pb-1">
                Additional Information
              </h3>
              
              <div className="space-y-1">
                <label htmlFor="remarks" className="block text-xs font-medium text-purple-700">
                  Remarks
                </label>
                <textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-md border border-purple-200 p-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Add any additional remarks or notes..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-t border-purple-100 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-md border border-purple-200 py-2 px-4 text-sm text-purple-700 hover:border-purple-300 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || imageUploading}
                className="rounded-md bg-gradient-to-r from-purple-600 to-pink-600 py-2 px-4 text-sm text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}