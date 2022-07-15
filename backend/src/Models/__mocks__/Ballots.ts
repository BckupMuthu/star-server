import { Ballot } from '../../../../domain_model/Ballot';

class BallotsDB {

    ballots: Ballot[] = []

    constructor() {
    }
    submitBallot(ballot: Ballot): Promise<Ballot>{
        if (this.ballots.length>0){
            ballot.ballot_id = this.ballots[this.ballots.length-1].ballot_id+1;
        } else{
            ballot.ballot_id = 0
        }
        const savedBallot = {...ballot};
        this.ballots.push(savedBallot)
        return Promise.resolve({...savedBallot})
    }
    getBallotsByElectionID(election_id:string): Promise<Ballot[] | null> {
        const ballots = this.ballots.filter(ballot => ballot.election_id===election_id)
        if (!ballots){
            return Promise.resolve(null)
        }
        var resBallots = ballots.map(function(b){return {...b}});
        return Promise.resolve(resBallots)
    }
    delete(ballot_id: number): Promise<Ballot | null> {
        const ballot = this.ballots.find(ballot => ballot.ballot_id===ballot_id)
        if (!ballot){
            return Promise.resolve(null)
        }
        this.ballots = this.ballots.filter(ballot => ballot.ballot_id!=ballot_id)
        return Promise.resolve(ballot)
    }
}
module.exports = BallotsDB