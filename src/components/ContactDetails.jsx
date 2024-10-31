import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PlusIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function ContactDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [interests, setInterests] = useState([]);
  const [products, setProducts] = useState([]);
  const { register, handleSubmit, reset } = useForm();
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:3000/api/contacts/${id}`).then(res => res.json()),
      fetch(`http://localhost:3000/api/interests/${id}`).then(res => res.json()),
      fetch('http://localhost:3000/api/products').then(res => res.json())
    ]).then(([contactData, interestsData, productsData]) => {
      setContact(contactData);
      setInterests(interestsData);
      setProducts(productsData);
      reset(contactData);
    }).catch(() => {
      toast.error('Error loading data');
      navigate('/');
    });
  }, [id, reset, navigate]);

  const onAddInterest = async (data) => {
    try {
      const response = await fetch('http://localhost:3000/api/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, contactId: id }),
      });

      if (response.ok) {
        const newInterest = await response.json();
        setInterests([...interests, newInterest]);
        setShowInterestForm(false);
        toast.success('Product interest added');
      } else {
        throw new Error('Failed to add interest');
      }
    } catch (error) {
      toast.error('Error adding product interest');
    }
  };

  const onAddFollowUp = async (data) => {
    try {
      const response = await fetch('http://localhost:3000/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, contactId: id }),
      });

      if (response.ok) {
        setShowFollowUpForm(false);
        toast.success('Follow-up scheduled');
      } else {
        throw new Error('Failed to schedule follow-up');
      }
    } catch (error) {
      toast.error('Error scheduling follow-up');
    }
  };

  const resendFollowUpEmail = async (followUpId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/follow-ups/${followUpId}/resend`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Follow-up email resent');
      } else {
        throw new Error('Failed to resend email');
      }
    } catch (error) {
      toast.error('Error resending follow-up email');
    }
  };

  if (!contact) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{contact.name}</h1>
            <p className="text-gray-500">{contact.company}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Contacts
          </button>
        </div>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-gray-900">{contact.email || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-gray-900">{contact.phone || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Next Follow-up</dt>
            <dd className="mt-1 text-gray-900">
              {contact.nextFollowUp ? new Date(contact.nextFollowUp).toLocaleDateString() : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Notes</dt>
            <dd className="mt-1 text-gray-900">{contact.notes || '-'}</dd>
          </div>
        </dl>
      </div>

      {/* Product Interests */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Product Interests</h2>
          <button
            onClick={() => setShowInterestForm(!showInterestForm)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {showInterestForm ? 'Cancel' : 'Add Interest'}
          </button>
        </div>

        {showInterestForm && (
          <form onSubmit={handleSubmit(onAddInterest)} className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Product</label>
              <select
                {...register('productName', { required: true })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a product...</option>
                {products.map(product => (
                  <option key={product.id} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Interest Level</label>
              <select
                {...register('interestLevel')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save Interest
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {interests.map((interest) => (
            <div
              key={interest.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <h3 className="font-medium text-gray-900">{interest.productName}</h3>
                <p className="text-sm text-gray-500 mt-1">{interest.notes}</p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${
                interest.interestLevel === 'High' ? 'bg-green-100 text-green-800' :
                interest.interestLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {interest.interestLevel}
              </span>
            </div>
          ))}
          {interests.length === 0 && (
            <p className="text-center text-gray-500 py-4">No product interests recorded yet.</p>
          )}
        </div>
      </div>

      {/* Follow-up Section */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Follow-ups</h2>
          <div className="flex space-x-4">
            <button
              onClick={() => resendFollowUpEmail(contact.id)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <EnvelopeIcon className="h-4 w-4 mr-2" />
              Resend Reminder
            </button>
            <button
              onClick={() => setShowFollowUpForm(!showFollowUpForm)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {showFollowUpForm ? 'Cancel' : 'Schedule Follow-up'}
            </button>
          </div>
        </div>

        {showFollowUpForm && (
          <form onSubmit={handleSubmit(onAddFollowUp)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                {...register('dueDate', { required: true })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Schedule Follow-up
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}