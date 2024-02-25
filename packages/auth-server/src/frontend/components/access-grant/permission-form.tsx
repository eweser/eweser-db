'use client';

import { useState } from 'react';
import type { Room } from '../../../model/rooms/schema';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../library/accordion';
import { Checkbox } from '../library/checkbox';
import type { LoginQueryOptions } from '@eweser/shared';
import { submitPermissionsChange } from '../../../app/access-grant/permission/actions';
import { Button } from '../library/button';

export default function PermissionForm({
  redirect,
  domain,
  collections,
  userId,
}: LoginQueryOptions & {
  userId: string;
  rooms: Room[];
}) {
  const [selectedCollections, _setSelectedCollections] =
    useState<LoginQueryOptions['collections']>(collections);
  const [selectedRoomIds, _setSelectedRoomIds] = useState<string[]>();
  const [keepAliveDays, _setKeepAliveDays] = useState<number>(1);

  const handleSubmit = async () => {
    const redirectUrl = await submitPermissionsChange(
      {
        domain,
        userId,
        roomIds: selectedRoomIds ?? [],
        collections: selectedCollections ?? [],
        keepAliveDays,
      },
      redirect
    );
    window.location.href = redirectUrl;
  };
  return (
    <>
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>
            <Checkbox></Checkbox>
          </AccordionTrigger>
          <AccordionContent>
            Yes. It adheres to the WAI-ARIA design pattern.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button onClick={handleSubmit}>Approve</Button>
    </>
  );
}
