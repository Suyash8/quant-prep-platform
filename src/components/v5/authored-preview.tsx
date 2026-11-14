'use client';
import { useState } from 'react';
import type { Lesson,Question } from '@/lib/v5/types';
import { createFixtureStore } from '@/lib/v5/store.fixture';
import { LessonExperience } from './lesson-experience';
/** Real authored content, synthetic in-memory learner state. Not an integrated offline route. */
export function AuthoredPreview({lesson,questions,fixturePackSha}:{lesson:Lesson;questions:Question[];fixturePackSha:string}){const [store]=useState(()=>createFixtureStore(questions.map(q=>({packSha:fixturePackSha,q}))));return <LessonExperience lesson={lesson} questions={Object.fromEntries(questions.map(q=>[q.id,q]))} packSha={fixturePackSha} store={store} fixture/>;}
