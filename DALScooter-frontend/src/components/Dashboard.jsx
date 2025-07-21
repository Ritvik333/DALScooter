import React, { useState, useEffect } from 'react';
import { PlusCircle, Bike, Battery, DollarSign } from 'lucide-react';

const Dashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'ebike',
    accessCode: '',
    batteryLife: 50,
    heightAdjustable: false,
    hourlyRate: 5.0,
    discountCode: ''
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState('Guest'); // Default role

  // Fetch role from localStorage and vehicles when component mounts
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setRole(storedRole);
    }

    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/get-vehicles', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
        }

        const data = await response.json();
        setVehicles(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const your_token_here = "eyJraWQiOiJ5dG9Ccmg1QW1DTWR0ckJDYkJQZ28rZ0dsdkxqemdWaHN5T3pXVzRpTjRRPSIsImFsZyI6IlJTMjU2In0.eyJjdXN0b206Y3VzdG9tOnJvbGUiOiJPcGVyYXRvciIsInN1YiI6IjgyMTZkOTEzLTFmNjQtNGE4ZS1hY2ZiLTliZDdlZDIwZmRhNCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV9IRVdVbENwYlEiLCJjb2duaXRvOnVzZXJuYW1lIjoiODIxNmQ5MTMtMWY2NC00YThlLWFjZmItOWJkN2VkMjBmZGE0Iiwib3JpZ2luX2p0aSI6ImI4NmFmZDM1LTAyN2QtNDNhYi1hNTE1LTQ3OTU5NzdlMDVmNCIsImF1ZCI6IjFrMGczNTE4NmZxbDJrc2djM2ozZGIxMWs5IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE3NTI5OTE4NzYsImV4cCI6MTc1Mjk5NTQ3NiwiaWF0IjoxNzUyOTkxODc2LCJqdGkiOiJhOGM0YzUyMy0xM2EzLTQ0ZWQtOTQ4ZS0wZTkxMTljNjBmZmEiLCJlbWFpbCI6InJpdHZpay53dXl5dXJ1QGdtYWlsLmNvbSJ9.8ugbEr_mpElx-96VTPETbvUMiEb8iBVulfyYfMnuyrWztGlXPCpwXAjlM1B8yp6L3CR-xHKGbziOwvtwBLFbHZ0stP6KHeV_zbiIHZfGdrVS-qqqG7dzJj8Z2vH4gHrFiVwdiu38pmFyJ0Q5-kttRHTqUfYrvLa9VNZTDCG-_-FTK-mkQLXrMRg6HtpPHyF4C-4lM96xzVQjVhm0SbYKaVa46t4ps98OOpFDEzpgQthFIj4xpzpCMV6PZhGJ8NoGn-4FDQM4uLrHsdQHyxmIkEMckuVe9TL5w-Wm6aB8LjFZC5gAjwBlvOExVRZN7ZO04FD64oGAcbM4Eifmsc3Itw";
      const response = await fetch('https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/add-vehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${your_token_here}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add vehicle: ${errorText}`);
      }

      const result = await response.json();
      console.log('Vehicle added successfully:', result);
      alert('Vehicle added successfully!');
      setShowModal(false);
      setFormData({
        type: 'ebike',
        accessCode: '',
        batteryLife: 50,
        heightAdjustable: false,
        hourlyRate: 5.0,
        discountCode: ''
      });
      const vehiclesResponse = await fetch('https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/get-vehicles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });
      if (vehiclesResponse.ok) {
        const data = await vehiclesResponse.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleBook = (vehicleId) => {
    if (role === 'Guest') {
      alert('Please log in as a Customer to book a vehicle.');
    } else {
      alert(`Booking vehicle ${vehicleId} as a ${role}. (This is a placeholder action.)`);
      // Add booking logic here (e.g., API call)
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-8">Admin Panel</h2>
        <ul className="space-y-4">
          <li className="font-semibold hover:text-purple-300 cursor-pointer">Dashboard</li>
          <li className="text-gray-400 hover:text-purple-300 cursor-pointer">Reports</li>
          <li className="text-gray-400 hover:text-purple-300 cursor-pointer">Settings</li>
        </ul>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-gray-800 text-white shadow-lg p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard ({role})</h1>
        </header>

        {/* Vehicle Catalog */}
        <main className="flex-1 p-6 relative">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Vehicle Catalog</h2>
          {loading ? (
            <p className="text-gray-600 text-xl">Loading vehicles...</p>
          ) : error ? (
            <p className="text-red-600 text-xl">Error: {error}</p>
          ) : vehicles.length === 0 ? (
            <p className="text-gray-600 text-xl">No vehicles to show.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.vehicleID}
                  className="bg-gradient-to-r from-purple-500 to-teal-500 bg-opacity-90 text-white p-6 rounded-xl shadow-md hover:shadow-xl transition duration-300"
                >
                  <div className="flex items-center mb-4">
                    <Bike className="h-8 w-8 mr-4 text-white" />
                    <h3 className="text-xl font-bold">{vehicle.type.toUpperCase()}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Battery className="h-6 w-6 mr-2 text-white" />
                      <p className="text-lg">Battery: {vehicle.batteryLife}%</p>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-6 w-6 mr-2 text-white" />
                      <p className="text-lg">Hourly Rate: ${vehicle.hourlyRate.toFixed(1)}</p>
                    </div>
                    <div className="flex items-center">
                      <p className="text-lg">Brand: {vehicle.franchiseName}</p>
                    </div>
                    <p className="text-lg"><strong>Height Adjustable:</strong> {vehicle.heightAdjustable ? 'Yes' : 'No'}</p>
                    {/* {vehicle.discountCode && (
                      <p className="text-lg"><strong>Discount Code:</strong> {vehicle.discountCode}</p>
                    )} */}
                    {(role === 'Customer' || role === 'Guest') && (
                      <button
                        onClick={() => handleBook(vehicle.vehicleID)}
                        className="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg transition duration-300"
                      >
                        Book
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Floating Add Button for Franchise Operator */}
          {role === 'Franchise Operator' && (
            <button
              onClick={() => setShowModal(true)}
              className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition duration-300 transform hover:scale-110"
            >
              <PlusCircle className="h-6 w-6" />
            </button>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Add New Vehicle</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700">Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="ebike">E-Bike</option>
                      <option value="gyroscooter">Gyroscooter</option>
                      <option value="segway">Segway</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700">Access Code</label>
                    <input
                      type="text"
                      name="accessCode"
                      value={formData.accessCode}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700">Battery Life: {formData.batteryLife}%</label>
                    <input
                      type="range"
                      name="batteryLife"
                      min="0"
                      max="100"
                      value={formData.batteryLife}
                      onChange={(e) => handleSliderChange('batteryLife', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700">Hourly Rate: ${formData.hourlyRate.toFixed(1)}</label>
                    <input
                      type="range"
                      name="hourlyRate"
                      min="0"
                      max="20"
                      step="0.5"
                      value={formData.hourlyRate}
                      onChange={(e) => handleSliderChange('hourlyRate', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="heightAdjustable"
                      checked={formData.heightAdjustable}
                      onChange={handleChange}
                      className="h-5 w-5 text-purple-600 focus:ring-2 focus:ring-purple-500"
                    />
                    <label className="ml-2 text-lg text-gray-700">Height Adjustable</label>
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700">Discount Code</label>
                    <input
                      type="text"
                      name="discountCode"
                      value={formData.discountCode}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300"
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