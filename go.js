#!/usr/bin/env node

const fs = require('fs')
const inquirer = require('inquirer')
const {
  spawnSync,
  getExerciseBranches,
  getVariants,
  getExtraCreditTitles,
} = require('./scripts/utils')

const actions = {
  changeExercise,
  startExtraCredit,
}

async function go() {
  const branch = spawnSync('git rev-parse --abbrev-ref HEAD')
  if (branch === 'master') {
    // if we're on master then you can't do anything else
    await changeExercise()
    return
  }

  const {action} = await inquirer.prompt([
    {
      name: 'action',
      message: `What do you want to do?`,
      type: 'list',
      choices: [
        {name: 'Change Exercise', value: 'changeExercise'},
        {name: 'Start Extra Credit', value: 'startExtraCredit'},
      ],
    },
  ])
  await actions[action]()
}

function getDisplayName(exerciseBranch) {
  const match = exerciseBranch.match(
    /exercises\/(?<number>\d\d)-(?<title>.*?)$/,
  )
  const title = match.groups.title.split('-').join(' ')
  const capitalizedTitle = title.slice(0, 1).toUpperCase() + title.slice(1)
  return `${match.groups.number}. ${capitalizedTitle}`
}

async function changeExercise() {
  const {branch} = await inquirer.prompt([
    {
      name: 'branch',
      message: `Which exercise do you want to start working on?`,
      type: 'list',
      choices: getExerciseBranches().map(b => ({
        name: getDisplayName(b),
        value: b,
      })),
    },
  ])
  spawnSync('git reset --hard HEAD')
  spawnSync(`git checkout ${branch}`)
  spawnSync('node ./scripts/swap exercise')
  console.log(`✅  Ready to start work in ${branch}`)
}

async function startExtraCredit() {
  const variants = getVariants()
  const maxExtra = Math.max(
    ...Object.values(variants)
      .flatMap(v => v.extras)
      .map(e => e.number),
  )

  const extraCreditTitles = getExtraCreditTitles()

  function getVariantDisplayName(variant) {
    if (variant === 'final') return 'Final'
    return `Extra Credit ${variant + 1}: ${extraCreditTitles[variant]}`
  }

  const {variant} = await inquirer.prompt([
    {
      name: 'variant',
      message: `Which part do you want to work on?`,
      type: 'list',
      choices: [
        {name: 'Final', value: 'final'},
        ...Array.from({length: maxExtra}, (v, i) => ({
          name: getVariantDisplayName(i),
          value: i,
        })),
      ],
    },
  ])

  for (const {extras, exercise, final} of Object.values(variants)) {
    if (variant === 'final') {
      // reset the exercise to the original state
      spawnSync(`git checkout -- ${exercise.file}`)
    } else {
      let newExerciseFile = exercise.file
      if (variant === 0) {
        newExerciseFile = final.file
      } else {
        newExerciseFile = extras[variant - 1].file
      }
      const newExerciseContents = fs.readFileSync(newExerciseFile, {
        encoding: 'utf-8',
      })
      fs.writeFileSync(exercise.file, newExerciseContents)
    }
  }
  console.log(`✅  Ready to start working on ${getVariantDisplayName(variant)}`)
}

go()
