import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';

const Dashboard = ({ role }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'ebike',
    accessCode: '',
    batteryLife: 50,
    heightAdjustable: false,
    hourlyRate: 5.0,
    discountCode: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSliderChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`New Vehicle Added:\n${JSON.stringify(formData, null, 2)}`);
    setShowModal(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow p-4">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <ul className="space-y-2">
          <li className="font-medium">Dashboard</li>
          <li className="text-gray-500">Reports</li>
          <li className="text-gray-500">Settings</li>
        </ul>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard ({role})</h1>
        </header>

        {/* Vehicle List */}
        <main className="flex-1 p-6 relative">
          <p className="text-gray-600">No vehicles to show.</p>

          {/* Floating Add Button */}
          <button
            onClick={() => setShowModal(true)}
            className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg"
          >
            <PlusCircle className="h-6 w-6" />
          </button>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <h2 className="text-xl font-semibold mb-4">Add New Vehicle</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type Dropdown */}
                  <div>
                    <label className="block font-medium mb-1">Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded">
                      <option value="ebike">E-Bike</option>
                      <option value="gyroscooter">Gyroscooter</option>
                      <option value="segway">Segway</option>
                    </select>
                  </div>

                  {/* Access Code */}
                  <div>
                    <label className="block font-medium mb-1">Access Code</label>
                    <input
                      type="text"
                      name="accessCode"
                      value={formData.accessCode}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>

                  {/* Battery Life Slider */}
                  <div>
                    <label className="block font-medium mb-1">Battery Life: {formData.batteryLife}%</label>
                    <input
                      type="range"
                      name="batteryLife"
                      min="0"
                      max="100"
                      value={formData.batteryLife}
                      onChange={(e) => handleSliderChange('batteryLife', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Hourly Rate Slider */}
                  <div>
                    <label className="block font-medium mb-1">Hourly Rate: ${formData.hourlyRate.toFixed(1)}</label>
                    <input
                      type="range"
                      name="hourlyRate"
                      min="0"
                      max="20"
                      step="0.5"
                      value={formData.hourlyRate}
                      onChange={(e) => handleSliderChange('hourlyRate', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {/* Height Adjustable Toggle */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="heightAdjustable"
                      checked={formData.heightAdjustable}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <label>Height Adjustable</label>
                  </div>

                  {/* Discount Code */}
                  <div>
                    <label className="block font-medium mb-1">Discount Code</label>
                    <input
                      type="text"
                      name="discountCode"
                      value={formData.discountCode}
                      onChange={handleChange}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  {/* Submit and Cancel */}
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-gray-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Add Vehicle
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
