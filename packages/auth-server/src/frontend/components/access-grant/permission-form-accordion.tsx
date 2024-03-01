'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../library/accordion';
import { Checkbox } from '../library/checkbox';
import { type LoginQueryOptions } from '@eweser/shared';
import { capitalizeFirstLetter } from '../../utils';
import Small from '../library/typography-small';
import Muted from '../library/typography-muted';
import type { PermissionFormProps } from './permission-form';

export type PermissionFormAccordionProps = PermissionFormProps & {
  collectionKeys: LoginQueryOptions['collections'];

  requestingAll: boolean;
  setRequestingAll: Dispatch<SetStateAction<boolean>>;
  selectedCollections: LoginQueryOptions['collections'];
  setSelectedCollections: Dispatch<
    SetStateAction<LoginQueryOptions['collections']>
  >;
  selectedRoomIds: string[];
  setSelectedRoomIds: Dispatch<SetStateAction<string[]>>;
};

export function PermissionFormAccordion({
  requestingAll,
  setRequestingAll,
  selectedCollections,
  setSelectedCollections,
  selectedRoomIds,
  setSelectedRoomIds,
  collectionKeys,
  rooms,
}: PermissionFormAccordionProps) {
  return (
    <Accordion type="single" defaultValue="all" collapsible>
      <AccordionItem value="all" className="border-none">
        <div className="flex w-full items-center">
          <Checkbox
            onCheckedChange={(checked) => {
              if (checked) {
                setRequestingAll(true);
                setSelectedCollections(['all']);
              } else {
                setRequestingAll(false);
                setSelectedCollections([]);
              }
            }}
            checked={requestingAll}
            defaultChecked={requestingAll}
          />
          <AccordionTrigger className="flex-1 w-full">
            <span>
              All folders <Muted className="inline">*</Muted>
            </span>
          </AccordionTrigger>
        </div>

        <AccordionContent className="pl-6">
          <Accordion type="multiple">
            {collectionKeys.map((collectionKey) => {
              const requestingAllThisCollection =
                selectedCollections.includes(collectionKey);
              return (
                <AccordionItem value={collectionKey} key={collectionKey}>
                  <div className="flex w-full items-center">
                    <Checkbox
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCollections((prev) => {
                            return prev
                              ? [...prev, collectionKey]
                              : [collectionKey];
                          });
                        } else {
                          if (requestingAll) {
                            setRequestingAll(false);
                            setSelectedCollections(
                              collectionKeys.filter(
                                (key) => key !== collectionKey
                              )
                            );
                          } else {
                            setSelectedCollections((prev) => {
                              return prev?.filter(
                                (key) => key !== collectionKey
                              );
                            });
                          }
                        }
                      }}
                      checked={requestingAll || requestingAllThisCollection}
                      defaultChecked={
                        requestingAll || requestingAllThisCollection
                      }
                    />
                    <AccordionTrigger>
                      <span>
                        All {capitalizeFirstLetter(collectionKey)}
                        <Muted className="inline">**</Muted>
                      </span>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent>
                    {rooms.filter(
                      (room) => room.collectionKey === collectionKey
                    ).length > 0 ? (
                      rooms
                        .filter((room) => room.collectionKey === collectionKey)
                        .map((room) => {
                          return (
                            <div
                              key={room.id}
                              className="flex pl-6 items-center mb-4"
                            >
                              <Checkbox
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedRoomIds((prev) => {
                                      return prev
                                        ? [...prev, room.id]
                                        : [room.id];
                                    });
                                  } else {
                                    if (requestingAllThisCollection) {
                                      setSelectedCollections((prev) => {
                                        return prev?.filter(
                                          (key) => key !== collectionKey
                                        );
                                      });
                                      setSelectedRoomIds((prev) => {
                                        return prev
                                          ?.filter((id) => id !== room.id)
                                          .concat(
                                            rooms
                                              .filter(
                                                (room) =>
                                                  room.collectionKey ===
                                                  collectionKey
                                              )
                                              .map((room) => room.id)
                                          );
                                      });
                                    }

                                    setSelectedRoomIds((prev) => {
                                      return prev?.filter(
                                        (id) => id !== room.id
                                      );
                                    });
                                  }
                                }}
                                checked={
                                  requestingAll ||
                                  requestingAllThisCollection ||
                                  selectedRoomIds.includes(room.id)
                                }
                                defaultChecked={
                                  requestingAll ||
                                  requestingAllThisCollection ||
                                  selectedRoomIds.includes(room.id)
                                }
                              />
                              <Small className="ml-2">{room.name}</Small>
                            </div>
                          );
                        })
                    ) : (
                      <Muted className="pl-6">{`No existing ${capitalizeFirstLetter(
                        collectionKey
                      )} folders`}</Muted>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
