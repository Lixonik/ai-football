pr=(
  "-t IBAPRO -x -10 -y 0"
  "-t IBAPRO -x -5 -y -25"
  "-t IBAPRO -x -5 -y 25"
  "-t IBAPRO -x -25 -y -3"
  "-t IBAPRO -x -25 -y 3"
  "-t IBAPRO -x -25 -y -15"
  "-t IBAPRO -x -25 -y 15"
  "-t IBAPRO -x -35 -y -25"
  "-t IBAPRO -x -35 -y 0"
  "-t IBAPRO -x -35 -y 25"
  "-t IBAPRO -r goalie -x -50 -y 0"
  "-t MILKYWAY -x -10 -y 0"
  "-t MILKYWAY -x -5 -y -25"
  "-t MILKYWAY -x -5 -y 25"
  "-t MILKYWAY -x -25 -y -3"
  "-t MILKYWAY -x -25 -y 3"
  "-t MILKYWAY -x -25 -y -15"
  "-t MILKYWAY -x -25 -y 15"
  "-t MILKYWAY -x -35 -y -25"
  "-t MILKYWAY -x -35 -y 0"
  "-t MILKYWAY -x -35 -y 25"
  "-t MILKYWAY -r goalie -x -50 -y 0"
)

for i in "${!pr[@]}"; do
  node ./src/app.js ${pr[$i]} &
  sleep 0.1
done

sleep 0.1