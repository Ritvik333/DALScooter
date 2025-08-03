import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const BookingRequests = ({ email }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null); // State for success message

  useEffect(() => {
    const fetchPendingBookings = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/get-pending-bookings?email=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('idToken')}`
            },
            mode: 'cors'
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch pending bookings: ${response.statusText}`);
        }

        const data = await response.json();
        setRequests(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (email) {
      fetchPendingBookings();
    }
  }, [email]);

  const handleAccept = async (bookingId) => {
    try {
      const response = await fetch(
        'https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/update-booking-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          },
          body: JSON.stringify({ bookingID: bookingId, action: 'accept' })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to accept booking: ${response.statusText}`);
      }

      const updatedRequests = requests.filter(req => req.bookingID !== bookingId);
      setRequests(updatedRequests);

      // Show success message if this was the last request
      if (updatedRequests.length === 0) {
        setSuccessMessage('Booking Approved');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (bookingId) => {
    try {
      const response = await fetch(
        'https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/update-booking-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('idToken')}`
          },
          body: JSON.stringify({ bookingID: bookingId, action: 'deny' })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to reject booking: ${response.statusText}`);
      }

      setRequests(requests.filter(req => req.bookingID !== bookingId));
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-200 text-yellow-800 border border-yellow-300';
      case 'confirmed':
        return 'bg-green-200 text-green-800 border border-green-300';
      case 'denied':
        return 'bg-red-200 text-red-800 border border-red-300';
      default:
        return 'bg-gray-200 text-gray-800 border border-gray-300';
    }
  };

  if (loading) return <p className="text-gray-600 text-xl">Loading requests...</p>;
  if (error) return <p className="text-red-600 text-xl">Error: {error}</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Booking Requests</h2>
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-200 text-green-800 border border-green-300 p-4 rounded-lg mb-4 text-center font-semibold">
          {successMessage}
        </div>
      )}
      {requests.length === 0 ? (
        <p className="text-gray-600 text-xl">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.bookingID}
              className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
            >
              <p><strong>Booking ID:</strong> {request.bookingID}</p>
              <p><strong>Vehicle ID:</strong> {request.vehicleID}</p>
              <p><strong>Start Time:</strong> {new Date(request.startTime).toLocaleString()}</p>
              <p><strong>End Time:</strong> {new Date(request.endTime).toLocaleString()}</p>
              <p><strong>Total Cost:</strong> ${request.totalCost || 'N/A'}</p>
              <p>
                <strong>Status:</strong>{' '}
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(request.status)}`}>
                  {request.status || 'N/A'}
                </span>
              </p>
              {request.status === 'pending' && (
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={() => handleAccept(request.bookingID)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-2 inline" /> Accept
                  </button>
                  <button
                    onClick={() => handleReject(request.bookingID)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4 mr-2 inline" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingRequests;