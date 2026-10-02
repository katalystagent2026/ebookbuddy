import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const AdminVocab = () => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Word Coach</CardTitle>
        <CardDescription>
          Learners build their own vocabulary deck in Word Coach. Each signed-in learner sees only their own words.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="hero" onClick={() => navigate("/word-coach")}>Open Word Coach</Button>
      </CardContent>
    </Card>
  );
};

export default AdminVocab;
