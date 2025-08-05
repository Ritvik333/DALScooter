import React, { useState, useEffect } from 'react';
import { PlusCircle, Bike, Battery, DollarSign, Clock, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import MyBookings from './MyBookings';
import BookingRequests from './BookingRequests';
// import axios from 'axios';

const Dashboard = ({ role: propRole, onLogout }) => {
  const [showModal, setShowModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    type: 'ebike',
    accessCode: '',
    batteryLife: 50,
    heightAdjustable: false,
    hourlyRate: 5.0,
    discountCode: ''
  });
  const [bookingFormData, setBookingFormData] = useState({
    startTime: '',
    endTime: ''
  });
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingID, setBookingID] = useState('');
  const [isError, setIsError] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState('Guest');
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [showBookingRequests, setShowBookingRequests] = useState(false);
  const [showFeedback, setShowFeedback] = useState({});

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
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
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const getSentimentColor = (score) => {
    if (score > 0.5) return 'bg-green-100 text-green-800';
    if (score > 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSentimentIcon = (score) => {
    if (score > 0.5) return <span role="img" aria-label="smile">😊</span>;
    if (score > 0) return <span role="img" aria-label="neutral">😐</span>;
    return <span role="img" aria-label="frown">☹️</span>;
  };

  const handleLogout = async () => {
    const accessToken = localStorage.getItem('AccessToken');
    const email = localStorage.getItem('email');
    if (role === 'guest' || !accessToken) {
      if (onLogout) {
        onLogout();
      } else {
        localStorage.removeItem('idToken');
        localStorage.removeItem('AccessToken');
        localStorage.removeItem('email');
        localStorage.removeItem('role');
        window.location.reload();
      }
      return;
    }

    try {
      const response = await fetch('https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          action: 'logout',
          accessToken,
          email
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Logout API call successful:', data);
      if (onLogout) onLogout();
    } catch (error) {
      console.error('Logout error:', {
        message: error.message,
        name: error.name,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : null
      });
      if (onLogout) {
        onLogout();
      } else {
        localStorage.removeItem('idToken');
        localStorage.removeItem('AccessToken');
        localStorage.removeItem('email');
        localStorage.removeItem('role');
        window.location.reload();
      }
    }
  };

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

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotalCost = () => {
    if (!selectedVehicle || !bookingFormData.startTime || !bookingFormData.endTime) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(`${today}T${bookingFormData.startTime}`);
    const end = new Date(`${today}T${bookingFormData.endTime}`);
    const hours = (end - start) / (1000 * 60 * 60);
    return hours > 0 ? (selectedVehicle.hourlyRate * hours).toFixed(2) : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('idToken');
    //   https://42c66q9hb2.execute-api.us-east-1.amazonaws.com/prod
      const response = await fetch('https://42c66q9hb2.execute-api.us-east-1.amazonaws.com/prod/add-vehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

  const handleBook = (vehicle) => {
    if (role === 'Guest') {
      alert('Please log in as a Customer to book a vehicle.');
    } else {
      setSelectedVehicle(vehicle);
      setBookingFormData({
        startTime: '',
        endTime: ''
      });
      setShowBookingModal(true);
    }
  };

  const getMessageStyle = (message) => {
    if (message.includes('successful')) {
      return 'bg-green-100 text-green-800 border border-green-200';
    } else if (message.includes('already booked') || message.includes('time') || message.includes('error')) {
      return 'bg-red-100 text-red-800 border border-red-200';
    } else {
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const start = new Date(`${today}T${bookingFormData.startTime}`);
    const end = new Date(`${today}T${bookingFormData.endTime}`);

    if (start < now) {
      alert('Start time must be later than the current time.');
      return;
    }
    if (end <= start) {
      alert('End time must be after the start time.');
      return;
    }

    try {
      const email = localStorage.getItem('email');

      const response = await fetch('https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/book-vehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleID: selectedVehicle.vehicleID,
          startTime: `${today}T${bookingFormData.startTime}:00Z`,
          endTime: `${today}T${bookingFormData.endTime}:00Z`,
          email
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        setBookingMessage(errorData.message || `Failed to book vehicle: ${response.statusText}`);
        setIsError(true);
        return;
      }

      const result = await response.json();
      setBookingID(result.bookingID || '');
      setBookingMessage('Booking requested!');
      setIsError(false);
      setTimeout(() => {
        setShowBookingModal(false);
        setBookingFormData({
          startTime: '',
          endTime: ''
        });
        setBookingMessage('');
      }, 2000);
    } catch (error) {
      console.error('Error booking vehicle:', error);
      setBookingMessage(error.message || 'Internal server error');
      setIsError(true);
    }
  };

  const toggleFeedback = (vehicleId) => {
    setShowFeedback(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-8">Dashboard Panel</h2>
        <ul className="space-y-4">
          <li className="font-semibold hover:text-purple-300 cursor-pointer">Dashboard</li>
          {role === 'customer' && (
            <li
              className="text-gray-400 hover:text-purple-300 cursor-pointer"
              onClick={() => setShowMyBookings(!showMyBookings)}
            >
              My Bookings
            </li>
          )}
          {role === 'operator' && (
            <li
              className="text-gray-400 hover:text-purple-300 cursor-pointer"
              onClick={() => setShowBookingRequests(!showBookingRequests)}
            >
              Booking Requests
            </li>
          )}
          <li className="text-gray-400 hover:text-purple-300 cursor-pointer">Settings</li>
          <li className="text-gray-400 hover:text-purple-300 cursor-pointer">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Log Out
            </button>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-gray-800 text-white shadow-lg p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard ({role})</h1>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 relative">
          {role === 'customer' && showMyBookings && <MyBookings email={localStorage.getItem('email')} />}
          {role === 'operator' && showBookingRequests && <BookingRequests email={localStorage.getItem('email')} />}
          {/* Vehicle Catalog */}
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Vehicle Catalog</h2>
          {loading ? (
            <p className="text-gray-600 text-xl">Loading vehicles...</p>
          ) : error ? (
            <p className="text-red-600 text-xl">Error: {error}</p>
          ) : vehicles.length === 0 ? (
            <p className="text-gray-600 text-xl">No vehicles to show.</p>
          ) : (
            <div className="space-y-4">
              {vehicles.map(vehicle => (
                <div
                  key={vehicle.vehicleID}
                  className="bg-gradient-to-r from-gray-500 to-gray-700 bg-opacity-90 text-white p-4 rounded-xl shadow-md hover:shadow-xl transition duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bike className="h-6 w-6 mr-3 text-white" />
                      <div>
                        <h3 className="text-lg font-bold">{vehicle.type.toUpperCase()}</h3>
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Battery className="h-5 w-5 mr-2 text-white" />
                            <p className="text-sm">Battery: {vehicle.batteryLife}%</p>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-5 w-5 mr-2 text-white" />
                            <p className="text-sm">Hourly Rate: ${vehicle.hourlyRate.toFixed(1)}</p>
                          </div>
                          <p className="text-sm">Brand: {vehicle.franchiseName}</p>
                          <p className="text-sm"><strong>Height Adjustable:</strong> {vehicle.heightAdjustable ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    </div>
                    {(role === 'customer' || role === 'Guest') && (
                      <button
                        onClick={() => handleBook(vehicle)}
                        className="ml-4 bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 rounded-lg text-sm transition duration-300"
                      >
                        Book
                      </button>
                    )}
                  </div>
                  {vehicle.feedbacks && vehicle.feedbacks.length > 0 && (
                    <div className="mt-2 w-full">
                      <button
                        onClick={() => toggleFeedback(vehicle.vehicleID)}
                        className="flex items-center text-sm text-white hover:text-purple-200 focus:outline-none w-full justify-center"
                      >
                        <ChevronDown
                          className={`h-4 w-4 mr-1 transform ${showFeedback[vehicle.vehicleID] ? 'rotate-180' : ''}`}
                        />
                        Show Feedback
                      </button>
                      {showFeedback[vehicle.vehicleID] && (
                        <div className="mt-2 space-y-2">
                          <h4 className="text-sm font-medium text-white">Feedback:</h4>
                          {/* Sentiment Summary */}
                          <div className="p-2 rounded-lg flex items-center justify-between">
                            <span className="text-sm font-medium text-white">Overall Sentiment:</span>
                            {vehicle.overall_sentiment && (
                              <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center ${getSentimentColor(vehicle.overall_sentiment.average_score)}`}>
                                {getSentimentIcon(vehicle.overall_sentiment.average_score)}
                                <span className="ml-2">{vehicle.overall_sentiment.label}</span>
                              </div>
                            )}
                          </div>
                          {/* Feedback List */}
                          {vehicle.feedbacks.map((feedback, index) => (
                            <div key={index} className="bg-white text-black p-2 rounded-md flex justify-between items-center">
                              <span>Anonymous: {feedback.message}</span>
                              <span className="text-gray-600 text-xs">(Posted: {new Date(feedback.timestamp).toLocaleString()})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Floating Add Button for Franchise Operator */}
          {role === 'operator' && (
            <button
              onClick={() => setShowModal(true)}
              className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition duration-300 transform hover:scale-110"
            >
              <PlusCircle className="h-6 w-6" />
            </button>
          )}

          {/* Add Vehicle Modal */}
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

          {/* Booking Modal */}
          {showBookingModal && selectedVehicle && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Book Vehicle</h2>
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700">Vehicle Type</label>
                    <input
                      type="text"
                      value={selectedVehicle.type.toUpperCase()}
                      readOnly
                      className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-purple-500" />
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      value={bookingFormData.startTime}
                      onChange={handleBookingChange}
                      min={new Date().toTimeString().slice(0, 5)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-purple-500" />
                      End Time
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      value={bookingFormData.endTime}
                      onChange={handleBookingChange}
                      min={bookingFormData.startTime || new Date().toTimeString().slice(0, 5)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-lg font-medium mb-2 text-gray-700">Total Cost</label>
                    <p className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100">
                      ${calculateTotalCost()}
                    </p>
                  </div>
                  {bookingMessage && (
                    <div
                      className={`mt-6 p-4 rounded-xl text-center text-sm font-medium animate-fade-in ${getMessageStyle(bookingMessage)}`}
                    >
                      <div className="flex items-center justify-center">
                        {bookingMessage.includes('requested') ? (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        ) : (
                          <AlertCircle className="w-4 h-4 mr-2" />
                        )}
                        <span>
                          {bookingMessage}
                          {bookingMessage.includes('requested') && bookingID && (
                            <span className="ml-2 font-bold">Booking ID: {bookingID}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBookingModal(false);
                        setBookingMessage('');
                      }}
                      className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300"
                    >
                      Confirm Booking
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