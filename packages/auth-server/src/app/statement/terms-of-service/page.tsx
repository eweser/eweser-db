import { siteConfig } from '@/frontend/config/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: siteConfig.pageName('Privacy'),
};

import React from 'react';

const TermsOfService = () => (
  <div className="max-w-xl self-center space-y-4 p-10">
    <h2 className="text-xl font-bold">
      Terms of Service Summary for eweser.com
    </h2>

    <p>
      <strong>Account Creation and Use:</strong> You must provide accurate
      information when creating an account. You are responsible for maintaining
      the security of your account and for all activities that occur under your
      account.
    </p>

    <p>
      <strong>User Data:</strong> You retain ownership of any data you store on
      eweser.com. However, by using our service, you grant us the permission to
      host, handle, and back up your data as necessary to provide and maintain
      our services.
    </p>

    <p>
      <strong>Service Availability:</strong> While we aim to provide a reliable
      and uninterrupted service, we cannot guarantee that the service will
      always be available or free from errors.
    </p>

    <p>
      <strong>Changes to Services:</strong> Our basic service is currently free,
      but this may change in the future. We may also offer additional, paid
      services, such as enhanced backup options.
    </p>

    <p>
      <strong>Liability:</strong> We are not liable for any data loss or
      corruption. We recommend regularly backing up your data to prevent loss.
    </p>

    <p>
      <strong>Amendments to Terms:</strong> We may update these terms from time
      to time. We will notify users of any significant changes, but we encourage
      you to review the ToS periodically.
    </p>

    <p>
      <strong>Governing Law:</strong> Any disputes related to these terms will
      be governed by the laws of the jurisdiction in which our company is
      registered.
    </p>

    <p>
      <strong>Contact Us:</strong> If you have any questions or concerns about
      these terms, please contact us.
    </p>

    <h2 className="text-xl font-bold">Acknowledgment</h2>
    <p>
      By using eweser.com, you acknowledge that you have read, understood, and
      agree to be bound by these Terms of Service.
    </p>
  </div>
);

export default TermsOfService;
