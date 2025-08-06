import React, { useState, useEffect } from 'react';
import { AlertCircle, MessageSquare, CheckCircle } from 'lucide-react';

const MyBookings = ({ email }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConcernModal, setShowConcernModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [concernMessage, setConcernMessage] = useState('');
  const [concernMessageResponse, setConcernMessageResponse] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackResponse, setFeedbackResponse] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/get-bookings?email=${encodeURIComponent(email)}`,
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
          throw new Error(`Failed to fetch bookings: ${response.statusText}`);
        }

        const data = await response.json();
        setBookings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (email) {
      fetchBookings();
    }
  }, [email]);

  const handleReportConcern = (bookingId) => {
    setSelectedBookingId(bookingId);
    setShowConcernModal(true);
  };

  const handleFeedback = (bookingId) => {
    setSelectedBookingId(bookingId);
    setShowFeedbackModal(true);
  };

  const handleConcernSubmit = async (e) => {
    e.preventDefault();
    const customerId = "123";
    const bookingReferenceCode = selectedBookingId;
    const contactEmail = localStorage.getItem('email') || 'ritvikb01021909@gmail.com';

    try {
      const response = await fetch('https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/concerns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`
        },
        body: JSON.stringify({
          customerId,
          bookingReferenceCode,
          concernMessage,
          contactEmail
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit concern: ${response.statusText}`);
      }

      const result = await response.json();
      setConcernMessageResponse(`Concern submitted successfully. Message ID: ${result.messageId}`);
      setConcernMessage('');
      setTimeout(() => setShowConcernModal(false), 2000);
    } catch (error) {
      setConcernMessageResponse(`Error submitting concern: ${error.message}`);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const customerId = "123";
    const bookingReferenceCode = selectedBookingId;
    const contactEmail = localStorage.getItem('email') || 'ritvikb01021909@gmail.com';

    try {
      const response = await fetch('https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/submit-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${localStorage.getItem('idToken')}`
        },
        body: JSON.stringify({
          customerId,
          bookingReferenceCode,
          feedbackMessage,
          contactEmail
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.statusText}`);
      }

      const result = await response.json();
      setFeedbackResponse(`Feedback submitted successfully. Feedback ID: ${result.feedbackId}`);
      setFeedbackMessage('');
      setTimeout(() => setShowFeedbackModal(false), 2000);
    } catch (error) {
      setFeedbackResponse(`Error submitting feedback: ${error.message}`);
    }
  };

  const getMessageStyle = (message) => {
    if (message.includes('successfully')) {
      return 'bg-green-100 text-green-800 border border-green-200';
    } else if (message.includes('error')) {
      return 'bg-red-100 text-red-800 border border-red-200';
    } else {
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-200 text-yellow-800 border border-yellow-300';
      case 'confirmed':
        return 'bg-green-200 text-green-800 border border-green-300';
      default:
        return 'bg-gray-200 text-gray-800 border border-gray-300';
    }
  };

  if (loading) return <p className="text-gray-600 text-xl">Loading bookings...</p>;
  if (error) return <p className="text-red-600 text-xl">Error: {error}</p>;
  if (bookings.length === 0) return <p className="text-gray-600 text-xl">No bookings found.</p>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">My Bookings</h2>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <div
            key={booking.bookingID}
            className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
          >
            <p><strong>Booking ID:</strong> {booking.bookingID}</p>
            <p><strong>Vehicle Type:</strong> {booking.vehicleType}</p>
            <p><strong>Start Time:</strong> {new Date(booking.startTime).toLocaleString()}</p>
            <p><strong>End Time:</strong> {new Date(booking.endTime).toLocaleString()}</p>
            {/* <p><strong>Total Cost:</strong> ${booking.totalCost || 'N/A'}</p> */}
            <p>
              <strong>Status:</strong>{' '}
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(booking.status)}`}>
                {booking.status || 'N/A'}
              </span>
            </p>
            <div className="mt-4 flex space-x-4">
              <button
                onClick={() => handleReportConcern(booking.bookingID)}
                className={`bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors ${booking.status === 'pending' ? 'cursor-not-allowed opacity-50' : ''}`}
                disabled={booking.status === 'pending'} // Disable if pending
              >
                <AlertCircle className="w-4 h-4 mr-2 inline" /> Report Concern
              </button>
              <button
                onClick={() => handleFeedback(booking.bookingID)}
                className={`bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors ${booking.status === 'pending' ? 'cursor-not-allowed opacity-50' : ''}`}
                disabled={booking.status === 'pending'} // Disable if pending
              >
                <MessageSquare className="w-4 h-4 mr-2 inline" /> Feedback
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Concern Modal */}
      {showConcernModal && selectedBookingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Report Concern</h2>
            <form onSubmit={handleConcernSubmit} className="space-y-6">
              <div>
                <label className="block text-lg font-medium mb-2 text-gray-700">Booking Reference Code</label>
                <input
                  type="text"
                  value={selectedBookingId}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-lg font-medium mb-2 text-gray-700">Concern Message</label>
                <textarea
                  value={concernMessage}
                  onChange={(e) => setConcernMessage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your concern here..."
                  required
                />
              </div>
              {concernMessageResponse && (
                <div
                  className={`mt-6 p-4 rounded-xl text-center text-sm font-medium animate-fade-in ${getMessageStyle(concernMessageResponse)}`}
                >
                  <div className="flex items-center justify-center">
                    {concernMessageResponse.includes('successfully') ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-2" />
                    )}
                    <span>{concernMessageResponse}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConcernModal(false);
                    setConcernMessage('');
                    setConcernMessageResponse('');
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300"
                >
                  Submit Concern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedBookingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Leave Feedback</h2>
            <form onSubmit={handleFeedbackSubmit} className="space-y-6">
              <div>
                <label className="block text-lg font-medium mb-2 text-gray-700">Booking Reference Code</label>
                <input
                  type="text"
                  value={selectedBookingId}
                  readOnly
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-lg font-medium mb-2 text-gray-700">Feedback</label>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your feedback here..."
                  required
                />
              </div>
              {feedbackResponse && (
                <div
                  className={`mt-6 p-4 rounded-xl text-center text-sm font-medium animate-fade-in ${getMessageStyle(feedbackResponse)}`}
                >
                  <div className="flex items-center justify-center">
                    {feedbackResponse.includes('successfully') ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-2" />
                    )}
                    <span>{feedbackResponse}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackMessage('');
                    setFeedbackResponse('');
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300"
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;