import React, { useState } from 'react';
import { useNotification } from '../components/ui/NotificationSystem';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { RadioGroup } from '../components/ui/RadioGroup';
import { Checkbox } from '../components/ui/Checkbox';
import { Switch } from '../components/ui/Switch';
import { Button } from '../components/ui/Button';

export const ContactUs: React.FC = () => {
  const { notify } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    method: 'email',
    message: '',
    subscribe: false,
    urgent: false
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      notify({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      notify({
        type: 'success',
        title: 'Message Sent!',
        message: 'We have received your message and will get back to you shortly.'
      });
      
      // Optionally reset form
      setFormData({
        name: '', email: '', subject: 'general', method: 'email', message: '', subscribe: false, urgent: false
      });
    }, 1500);
  };

  return (
    <div className="py-12 px-6">
      <div className="max-w-3xl mx-auto relative">
        {/* Background blobs for ambient effect */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-md-primary/10 blur-3xl -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-md-secondary-container/50 blur-3xl bottom-0 right-0 pointer-events-none" />

        <div className="relative z-10 bg-md-surface-container rounded-3xl p-8 md:p-12 shadow-sm border border-white/40">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
            <p className="text-md-on-surface-variant">We'd love to hear from you. Please fill out this form and we will get in touch shortly.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Full Name *" 
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
              <Input 
                label="Email Address *" 
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <Select 
              label="Subject"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              options={[
                { value: 'general', label: 'General Inquiry' },
                { value: 'support', label: 'Technical Support' },
                { value: 'feedback', label: 'Feedback' },
                { value: 'partnership', label: 'Partnership Opportunities' }
              ]}
            />

            <div>
              <p className="text-sm font-medium mb-3 text-md-on-surface-variant">Preferred Contact Method</p>
              <RadioGroup 
                name="contactMethod"
                value={formData.method}
                onChange={(val) => handleChange('method', val)}
                orientation="horizontal"
                options={[
                  { value: 'email', label: 'Email' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'post', label: 'Post' }
                ]}
              />
            </div>

            <Textarea 
              label="Message *"
              placeholder="How can we help you?"
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
            />

            <div className="space-y-4 pt-2">
              <Switch 
                label="Mark as Urgent"
                checked={formData.urgent}
                onChange={(e) => handleChange('urgent', e.target.checked)}
              />
              <Checkbox 
                label="Subscribe to our newsletter for updates."
                checked={formData.subscribe}
                onChange={(e) => handleChange('subscribe', e.target.checked)}
              />
            </div>

            <div className="pt-6 flex justify-end gap-4">
              <Button type="button" variant="text" onClick={() => window.history.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="combined" size="lg" isLoading={isSubmitting}>
                Send Message
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
