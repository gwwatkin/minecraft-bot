const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder')


RANGE_GOAL=1

function make_goal_near(position, range=RANGE_GOAL)
{
    return new GoalNear(position.x, position.y, position.z, range)
}

function itemToString (item) {
    if (item) {
        return `${item.name} x ${item.count}`
    } else {
        return '(nothing)'
    }
}

function position_to_string(position)
{
    return " "+position.x+", "+position.y+", "+position.z
}

function isSolidBlock(block)
{
    return block.boundingBox !== 'empty' && block.diggable;
}

function onDiggingCompleted (err)
{
    if (err) {
        console.log(err.stack)
        return
    }
}

async function sleep(t)
{
    return new Promise(r => setTimeout(r, t))
}

module.exports = {make_goal_near,itemToString, isSolidBlock, onDiggingCompleted,sleep}