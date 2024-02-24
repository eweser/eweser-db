import { siteConfig } from '../../../frontend/config/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: siteConfig.pageName('Privacy'),
};

import React from 'react';

const PrivacyStatement = () => (
  <div className="max-w-xl self-center space-y-4 p-10">
    <h2 className="text-xl font-bold">Privacy Statement for eweser.com</h2>

    <p>
      <strong>
        At eweser.com, we are committed to protecting the privacy of our users.
      </strong>{' '}
      {`Our services allow users to manage their own user-owned databases, with options for hosting through eweser.com or choosing their own authentication server provider. Here's how we handle your data:`}
    </p>

    <p>
      <strong>Information We Collect:</strong> We collect information necessary
      to provide our services, such as your email address and any data you store
      in your database. We may also collect usage data to improve the
      functionality of eweser.com.
    </p>

    <p>
      <strong>How We Use Your Data:</strong> Your information helps us deliver
      and improve our services, provide customer support, and ensure the
      security of our platform. We do not share your personal data with
      advertisers or third parties for marketing purposes.
    </p>

    <p>
      <strong>Data Hosting and Security:</strong> You have the choice to host
      your database with us or select an external provider. We strive to protect
      your data but do not guarantee that data loss will never occur.
    </p>

    <p>
      <strong>Your Rights:</strong> You have the right to access, modify, and
      delete your data. If you wish to exercise these rights or have any
      questions, please contact us directly.
    </p>

    <p>
      <strong>Changes to This Statement:</strong> We may update our Privacy
      Statement from time to time. We encourage users to review it regularly to
      stay informed about how we are protecting your information.
    </p>

    <p>
      This statement is a summary of our full Privacy Policy. For more detailed
      information, please read our complete policy or contact us if you have any
      questions.
    </p>
  </div>
);

export default PrivacyStatement;
