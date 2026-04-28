require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const User = require(path.join(__dirname, '..', 'models', 'Users'));
const Course = require(path.join(__dirname, '..', 'models', 'Course'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase();
}

async function connect() {
  await mongoose.connect(MONGO_URI);
}

async function loadPrograms(programNames) {
  const normalized = programNames.map(normalizeKey);
  const courses = await Course.find({
    $or: [
      { courseCode: { $in: normalized } },
      { title: { $in: programNames } },
    ],
  }).collation({ locale: 'en', strength: 2 });

  const matched = [];
  const byKey = new Map();
  for (const course of courses) {
    byKey.set(normalizeKey(course.courseCode), course);
    if (course.title) byKey.set(normalizeKey(course.title), course);
  }

  for (const raw of programNames) {
    const key = normalizeKey(raw);
    const existing = byKey.get(key);
    if (existing) {
      matched.push(existing);
      continue;
    }

    // Try to find by title or code case-insensitive when the input is not exact
    const found = courses.find(c => normalizeKey(c.courseCode) === key || normalizeKey(c.title) === key);
    if (found) {
      matched.push(found);
      continue;
    }

    // If still missing, create a new program entry with a normalized code.
    const courseCode = raw.match(/^[A-Za-z0-9]+$/) ? raw.toUpperCase() : raw
      .split(/\s+/)
      .map(tok => tok[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 6) || raw.toUpperCase();
    const title = raw;

    const newCourse = new Course({ courseCode, title, description: `Auto-created program for data distribution: ${raw}` });
    await newCourse.save();
    matched.push(newCourse);
    console.log(`Created missing program entry: ${courseCode} / ${title}`);
  }

  return matched;
}

async function distributeStudents(programs) {
  const allStudents = await User.find({ role: 'student' }).sort({ _id: 1 });
  if (!allStudents.length) {
    console.log('No student records found.');
    return;
  }

  const updates = allStudents.map((student, index) => {
    const program = programs[index % programs.length];
    return {
      updateOne: {
        filter: { _id: student._id },
        update: {
          $set: {
            course: program.title || program.courseCode,
            courseCode: program.courseCode,
          },
        },
      },
    };
  });

  const result = await User.bulkWrite(updates, { ordered: false });
  console.log('Student distribution complete.');
  console.log(`Total students updated: ${result.nModified || result.modifiedCount || 0}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('Usage: node distribute_students_across_programs.js <program1> <program2> <program3> [<program4> ...]');
    console.error('Example: node distribute_students_across_programs.js BIT BSCS BSE');
    process.exit(1);
  }

  try {
    await connect();
    console.log('Connected to MongoDB.');
    const programs = await loadPrograms(args);
    console.log('Distributing students across programs:', programs.map(p => `${p.courseCode}:${p.title || ''}`).join(', '));
    await distributeStudents(programs);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
