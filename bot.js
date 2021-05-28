const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer
const vec3 = require('vec3')

const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder')


const bot = mineflayer.createBot({
  host: "3.230.142.29"// '34.239.154.0',             // minecraft server ip
  //port: 42031
})

bot.loadPlugin(pathfinder)

// if (process.argv.length < 4 || process.argv.length > 6) {
//   console.log('Usage : node digger.js <host> <port> [<name>] [<password>]')
//   process.exit(1)
// }
// const bot = mineflayer.createBot({
//   host: process.argv[2],
//   port: parseInt(process.argv[3]),
//   username: process.argv[4] ? process.argv[4] : 'digger',
//   password: process.argv[5]
// })

const RANGE_GOAL = 1 // get within this radius of the player 


let stop = false


bot.once('spawn', () => {
//   mineflayerViewer(bot, { port: 3007, firstPerson: false })

    bot.mcData = require('minecraft-data')(bot.version)
    const defaultMove = new Movements(bot, bot.mcData)

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return
        
        args = message.split(" ")
        argn = args.length
        command = args[0]    
        
        stop = false
        switch (command) {
            case 'loaded':
                await bot.waitForChunksToLoad()
                bot.chat('Ready!')
                break
            case 'list':
                sayItems()
                break
            case 'dig':
                dig()
                break
            case 'build':
                build()
                break
            case 'equip':
                equipItem(args[1])
                break
            case 'come':
                come(username,defaultMove)
                break
            case 'quarry':
                if(argn !== 3)
                {
                    bot.chat("Usage: quarry radius depth")
                    return
                }
                radius = eval(args[1])
                depth = eval(args[2])
                quarry(radius, depth)
                break
            case 'stop':
                stop = true
                break
            case 'dump':

                break
        }
    })
})
function sayItems (items = bot.inventory.items()) {
  const output = items.map(itemToString).join(', ')
  if (output) {
    bot.chat(output)
  } else {
    bot.chat('empty')
  }
}

function dig () {
  let target
  if (bot.targetDigBlock) {
    bot.chat(`already digging ${bot.targetDigBlock.name}`)
  } else {
    target = bot.blockAt(bot.entity.position.offset(0, -1, 0))
    if (target && bot.canDigBlock(target)) {
      bot.chat(`starting to dig ${target.name}`)
      bot.dig(target, onDiggingCompleted)
    } else {
      bot.chat('cannot dig')
    }
  }

  function onDiggingCompleted (err) {
    if (err) {
      console.log(err.stack)
      return
    }
    bot.chat(`finished digging ${target.name}`)
  }
}

function build () {
  const referenceBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0))
  const jumpY = Math.floor(bot.entity.position.y) + 1.0
  bot.setControlState('jump', true)
  bot.on('move', placeIfHighEnough)

  let tryCount = 0

  function placeIfHighEnough () {
    if (bot.entity.position.y > jumpY) {
      bot.placeBlock(referenceBlock, vec3(0, 1, 0), (err) => {
        if (err) {
          tryCount++
          if (tryCount > 10) {
            bot.chat(err.message)
            bot.setControlState('jump', false)
            bot.removeListener('move', placeIfHighEnough)
            return
          }
          return
        }
        bot.setControlState('jump', false)
        bot.removeListener('move', placeIfHighEnough)
        bot.chat('Placing a block was successful')
      })
    }
  }
}

function equipDirt ()
{
    equipItem('dirt')
}

async function equipItem(item_name)
{
  let itemsByName
  if (bot.supportFeature('itemsAreNotBlocks')) {
    itemsByName = 'itemsByName'
  } else if (bot.supportFeature('itemsAreAlsoBlocks')) {
    itemsByName = 'blocksByName'
  }

   equipped = true
   await bot.equip(bot.mcData[itemsByName][item_name].id, 'hand', (err) => {
        if (err) {
            bot.chat(`unable to equip ${item_name}: ${err.message}`)
            equipped = false
        }
    })

    return equipped
}

function itemToString (item) {
  if (item) {
    return `${item.name} x ${item.count}`
  } else {
    return '(nothing)'
  }
}



function come(username,moveMethod)
{
    const target = bot.players[username]?.entity
    if (!target) {
    bot.chat("I don't see you !")
    return
    }
    const { x: playerX, y: playerY, z: playerZ } = target.position
    console.log(bot.entity.position)

    bot.pathfinder.setMovements(moveMethod)
    bot.pathfinder.setGoal(new GoalNear(playerX, playerY, playerZ, RANGE_GOAL))
}




function position_to_string(position)
{
    return " "+position.x+", "+position.y+", "+position.z
}


async function quarry(radius,depth)
{

    const { x: start_x, y: start_y, z: start_z } = bot.entity.position
    const start_pos =  bot.entity.position
    console.log("Starting quarry centered at "+start_x+", "+start_z);

    let level = -1 // Level indicates where we are from top layer of the quarry
    for(level = -1; level >= -depth; level--)
    {
        console.log("Quarry at level: "+level)

        const success = await quarry_dig_level(start_pos, level)
        if(!success) return;

        await try_place_on_quarry_wall(start_pos, level, 'ladder', vec3(1,0,0))

        if(level%5 == 0)
            await try_place_on_quarry_wall(start_pos, level, 'torch', vec3(-1,0,0))


    } // done with digging

    await quarry_bottom_harvest(radius, depth, start_pos);
    bot.chat("Finished quarry at "+position_to_string(start_pos.offset(0,-depth,0)))
}


async function try_place_on_quarry_wall(start_pos, level, block_name, direction)
{
    equipped = await equipItem(block_name)
    if(!equipped) return

    // Go to a wall
    torch_target_pos = start_pos.offset((radius+1)*(-direction.x),level,(radius+1)*(-direction.z))
    await bot.pathfinder.goto(make_goal_near(torch_target_pos),0)

    await bot.placeBlock(bot.blockAt(torch_target_pos),direction)

    // Back to center
    await bot.pathfinder.goto(make_goal_near(start_pos.offset(0,level,0),0))
}

async function quarry_dig_level(start_pos, level)
{
    l = quarry_offsets(radius,level)
    if(!check_boundaries(start_pos.offset(0,level,0),radius))
        return false;
    for(j in l)
    {
        offset = l[j]
        await quarry_dig_block(bot.blockAt(start_pos.offset(offset.x,offset.y,offset.z)))

        if(stop)
        {
            stop = false
            return false
        }
    }
    return true
}



async function quarry_dig_block(target_block)
{
    // If block below is not diggable means there is something empty like a cave
    if(!quarry_can_dig(bot.blockAt(target_block.position.offset(0,-1,0))))
    {
        bot.chat("Stopping Quarry: found undiggable under block "+position_to_string(target_block.position))
        stop = true;
        return;
    }


    // Try getting closer if can't mine the block
    if(!bot.canDigBlock(target_block))
    {
        await bot.pathfinder.goto(new GoalNear(
            target_block.position.x, target_block.position.y+1, target_block.position.z, RANGE_GOAL))
    }

    if(bot.canDigBlock(target_block))
    {
        await bot.equip(bot.pathfinder.bestHarvestTool(target_block));
        await bot.dig(target_block,onDiggingCompleted);
    }
    else
    {
        // If still can't mine abort
        bot.chat("Could not mine block at position ")
    }
}


async function quarry_bottom_harvest(radius, depth, start_pos)
{
    // Harvest the resources
    l = quarry_offsets(radius, -depth)
    for (j in l) {
        offset = l[j]
        target_block = bot.blockAt(start_pos.offset(offset.x, offset.y, offset.z))
        await bot.pathfinder.goto(make_goal_near(target_block.position))
    }

    await bot.pathfinder.goto(make_goal_near(start_pos.offset(0, -depth, 0),0)) // Back to the center
}



function is_diggable(center, x_offset, y_offset, z_offset)
{
    target = center.offset(x_offset, y_offset, z_offset)
    if(!quarry_can_dig(bot.blockAt(target)))
    {
        bot.chat("Stopping Quarry: found undiggable block at "+target.x+", "+target.y+", "+target.z)
        bot.pathfinder.goto(make_goal_near(target, 2))
        return false;
    }
    return true;
}

function check_boundaries(lvl_center, radius)
{
    for(i = -radius-1; i<=radius+1; i++)
    {
        if(!is_diggable(lvl_center, i, 0,-radius-1)) return false
        if(!is_diggable(lvl_center, i, 0,+radius+1)) return false
        if(!is_diggable(lvl_center, -radius-1, 0, i)) return false
        if(!is_diggable(lvl_center, +radius+1, 0, i)) return false
    }

    console.log("Boundaries clear")
    return true;
}


function quarry_can_dig(block)
{
    return block.boundingBox !== 'empty' && block.diggable;
}


function quarry_offsets(radius,level)
{
    l = []
    for(i = -radius; i<=radius; i++)
    {
        for(j = -radius; j<=radius; j++)
        {
          l.push({x:i,y:level,z:j})  
        }
    }
    return l
}



function onDiggingCompleted (err) {
    if (err) {
      console.log(err.stack)
      return
    }
}


function make_goal_near(position, range=RANGE_GOAL)
{
    return new GoalNear(position.x, position.y, position.z, range)
}